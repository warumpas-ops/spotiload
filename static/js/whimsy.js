/**
 * whimsy.js — Whimsy Spotify Player & Downloader Controller
 */

let whimsyPlaylistData = null;
let currentTrackIndex = 0;
const audioEngine = document.getElementById("audio-engine");

function formatTime(ms) {
    if (!ms) return "0:00";
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

async function fetchWhimsyPlaylist() {
    const input = document.getElementById("spotify-url-input");
    const url = input.value.trim();
    if (!url) return;

    const btn = document.getElementById("import-btn");
    btn.textContent = "...";
    btn.disabled = true;

    try {
        const res = await fetch("/api/playlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });

        const data = await res.json();
        if (res.ok) {
            whimsyPlaylistData = data;
            renderWhimsyUI(data);
        } else {
            alert(data.error || "Could not fetch playlist");
        }
    } catch (err) {
        alert("Server network error");
    } finally {
        btn.textContent = "Fetch";
        btn.disabled = false;
    }
}

function renderWhimsyUI(data) {
    document.getElementById("banner-title").textContent = data.name;
    document.getElementById("banner-meta").textContent = `${data.owner} • ${data.total_tracks} tracks`;
    if (data.cover_url) {
        document.getElementById("banner-img").src = data.cover_url;
    }

    const list = document.getElementById("whimsy-track-list");
    list.innerHTML = "";

    data.tracks.forEach((t, i) => {
        const row = document.createElement("div");
        row.className = "track-row";
        row.onclick = () => selectAndPlayTrack(i);
        row.innerHTML = `
            <span class="col-num">${i + 1}</span>
            <div class="col-title">
                <img src="${t.cover_url || data.cover_url || ''}" alt="">
                <div>
                    <div class="t-name">${t.title}</div>
                    <div class="t-artist">${t.artist}</div>
                </div>
            </div>
            <div class="col-album t-album">${t.album || 'Single'}</div>
            <div class="col-duration t-album">${formatTime(t.duration_ms)}</div>
        `;
        list.appendChild(row);
    });
}

function selectAndPlayTrack(index) {
    if (!whimsyPlaylistData || !whimsyPlaylistData.tracks[index]) return;
    currentTrackIndex = index;
    const track = whimsyPlaylistData.tracks[index];

    document.getElementById("player-title").textContent = track.title;
    document.getElementById("player-artist").textContent = track.artist;
    if (track.cover_url) {
        document.getElementById("player-thumb").src = track.cover_url;
    }
}

function toggleAudioPlay() {
    if (audioEngine.paused) {
        audioEngine.play().catch(() => {});
    } else {
        audioEngine.pause();
    }
}

async function startWhimsyDownload() {
    const input = document.getElementById("spotify-url-input");
    const url = input.value.trim();
    if (!url) return;

    const btn = document.getElementById("whimsy-download-btn");
    btn.disabled = true;
    btn.querySelector("span").textContent = "Downloading...";

    try {
        const res = await fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (res.ok) {
            listenProgress(data.session_id);
        } else {
            alert(data.error);
            btn.disabled = false;
        }
    } catch (e) {
        alert("Download error");
        btn.disabled = false;
    }
}

function listenProgress(sessionId) {
    const btn = document.getElementById("whimsy-download-btn");
    const evtSource = new EventSource(`/api/progress/${sessionId}`);

    evtSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.status === "downloading") {
            btn.querySelector("span").textContent = `Downloading ${data.current}/${data.total}`;
        } else if (data.status === "complete") {
            evtSource.close();
            btn.querySelector("span").textContent = "Download Complete!";
            window.location.href = `/api/file/${sessionId}`;
            setTimeout(() => {
                btn.disabled = false;
                btn.querySelector("span").textContent = "Download Playlist";
            }, 4000);
        }
    };
}
