/**
 * app.js — Frontend logic for Spotiload
 * Handles: playlist fetching, track list rendering with per-track progress bars, SSE download progress, zip download
 */

let currentPlaylistUrl = "";
let currentSessionId = "";
let currentPlaylistData = null;

// ---------- Helpers ----------

function formatDuration(ms) {
    if (!ms) return "--:--";
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function showError(msg) {
    const el = document.getElementById("error-message");
    el.textContent = msg;
    el.classList.add("visible");
    setTimeout(() => el.classList.remove("visible"), 6000);
}

function hideError() {
    document.getElementById("error-message").classList.remove("visible");
}

function setLoading(btn, loading) {
    if (loading) {
        btn.classList.add("loading");
        btn.disabled = true;
    } else {
        btn.classList.remove("loading");
        btn.disabled = false;
    }
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

// ---------- Fetch Playlist ----------

async function fetchPlaylist() {
    const url = document.getElementById("playlist-url").value.trim();
    if (!url) {
        showError("Paste a Spotify playlist link first!");
        return;
    }

    hideError();
    const btn = document.getElementById("fetch-btn");
    setLoading(btn, true);

    try {
        const res = await fetch("/api/playlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });

        const data = await res.json();

        if (!res.ok) {
            showError(data.error || "Something went wrong");
            return;
        }

        currentPlaylistUrl = url;
        renderPlaylist(data);
    } catch (err) {
        showError("Network error — is the server running?");
    } finally {
        setLoading(btn, false);
    }
}

// Fetch Today's Top Trending Hits automatically for the Aero Bubble Player!
async function fetchTrendingSongs() {
    try {
        const res = await fetch("/api/trending");
        if (!res.ok) return;
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0 && typeof loadWmpPlaylist === "function") {
            loadWmpPlaylist(data.tracks, data.cover_url);
        }
    } catch (e) {
        console.log("Could not load trending songs:", e);
    }
}

// Enter key to fetch & Auto-load Trending Songs for Player
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("playlist-url");
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") fetchPlaylist();
        });
    }
    fetchTrendingSongs();
});

// ---------- Render Playlist or Song ----------

function renderPlaylist(data) {
    currentPlaylistData = data;

    // Update Header Label (SONG vs PLAYLIST)
    const labelElem = document.getElementById("playlist-label");
    const dlBtnText = document.getElementById("download-btn-text");

    if (data.type === "track" || data.total_tracks === 1) {
        if (labelElem) labelElem.textContent = "SONG";
        if (dlBtnText) dlBtnText.textContent = "Download MP3";
    } else {
        if (labelElem) labelElem.textContent = "PLAYLIST";
        if (dlBtnText) dlBtnText.textContent = `Download All (${data.total_tracks} tracks)`;
    }

    // Header metadata
    document.getElementById("playlist-cover").src = data.cover_url || "";
    document.getElementById("playlist-name").textContent = data.name;
    document.getElementById("playlist-meta").textContent =
        `${data.owner} • ${data.total_tracks} track${data.total_tracks !== 1 ? "s" : ""}`;

    // Initialize WMP Orbit Player Queue
    if (typeof loadWmpPlaylist === "function") {
        loadWmpPlaylist(data.tracks, data.cover_url);
    }

    // Track list
    const trackList = document.getElementById("track-list");
    trackList.innerHTML = "";

    data.tracks.forEach((track, i) => {
        const div = document.createElement("div");
        div.className = "track-item";
        div.style.animationDelay = `${i * 0.02}s`;
        div.id = `track-${track.id}`;
        div.dataset.title = track.title;
        div.dataset.artist = track.artist;

        // Click track row to play on WMP Orbit Player!
        div.onclick = (e) => {
            if (typeof wmpSetTrack === "function") {
                wmpSetTrack(i, true);
            }
        };

        div.innerHTML = `
            <span class="track-number">${i + 1}</span>
            <img class="track-cover" src="${track.cover_url || ""}" alt="" loading="lazy">
            <div class="track-info">
                <div class="track-title">${escapeHtml(track.title)}</div>
                <div class="track-artist">${escapeHtml(track.artist)}</div>
                <div class="track-mini-progress">
                    <div class="track-mini-progress-bar"></div>
                </div>
            </div>
            <div class="track-meta-side">
                <span class="track-status-badge"></span>
                <span class="track-duration">${formatDuration(track.duration_ms)}</span>
                <button class="track-dl-btn" id="single-dl-${i}" title="Download '${escapeHtml(track.title)}' as MP3" onclick="downloadSingleTrack(event, ${i})">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <div class="track-status">
                <div class="mini-spinner"></div>
                <svg class="check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <svg class="error-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            </div>
        `;
        trackList.appendChild(div);
    });

    // Show section
    document.getElementById("playlist-section").classList.remove("hidden");
    document.getElementById("playlist-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- Download Individual Track Directly ----------

async function downloadSingleTrack(event, index) {
    if (event) {
        event.stopPropagation();
    }
    if (!currentPlaylistData || !currentPlaylistData.tracks || !currentPlaylistData.tracks[index]) return;

    const track = currentPlaylistData.tracks[index];
    const btn = document.getElementById(`single-dl-${index}`);
    if (!btn || btn.classList.contains("loading")) return;

    const originalHtml = btn.innerHTML;
    btn.classList.add("loading");
    btn.innerHTML = `<div class="mini-spinner" style="display:inline-block;width:14px;height:14px;border-width:2px;border-top-color:#00FFCC;"></div>`;

    try {
        const res = await fetch("/api/download-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ track }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Download failed");
        }

        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        const safeFilename = `${track.artist} - ${track.title}`.replace(/[<>:"/\\|?*]/g, "_") + ".mp3";
        a.download = safeFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);

        btn.classList.remove("loading");
        btn.classList.add("success");
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#00FFCC" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        setTimeout(() => {
            btn.classList.remove("success");
            btn.innerHTML = originalHtml;
        }, 3500);

    } catch (err) {
        console.error("Single download error:", err);
        showError(`Failed to download '${track.title}': ${err.message}`);
        btn.classList.remove("loading");
        btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#FF3366" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        `;
        setTimeout(() => {
            btn.innerHTML = originalHtml;
        }, 3000);
    }
}

// ---------- Start Full Playlist / Single Download ----------

async function startDownload() {
    if (!currentPlaylistUrl) return;

    // If it is a single song, download the MP3 directly!
    if (currentPlaylistData && (currentPlaylistData.type === "track" || currentPlaylistData.total_tracks === 1)) {
        return downloadSingleTrack(null, 0);
    }

    const btn = document.getElementById("download-btn");
    btn.disabled = true;
    const spanText = document.getElementById("download-btn-text") || btn.querySelector("span");
    spanText.textContent = "Downloading (2 parallel)...";

    try {
        const res = await fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: currentPlaylistUrl }),
        });

        const data = await res.json();

        if (!res.ok) {
            showError(data.error || "Failed to start download");
            btn.disabled = false;
            spanText.textContent = `Download All (${currentPlaylistData.total_tracks} tracks)`;
            return;
        }

        currentSessionId = data.session_id;
        showProgressSection();
        listenForProgress(data.session_id);
    } catch (err) {
        showError("Network error — is the server running?");
        btn.disabled = false;
        spanText.textContent = "Download All";
    }
}


function showProgressSection() {
    document.getElementById("progress-section").classList.remove("hidden");
    document.getElementById("progress-log").innerHTML = "";
    document.getElementById("progress-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- SSE Progress ----------

function listenForProgress(sessionId) {
    const evtSource = new EventSource(`/api/progress/${sessionId}`);

    evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.status === "downloading") {
            updateProgressUI(data);
            markTrackDownloading(data);
        } else if (data.status === "done") {
            markTrackDone(data);
            addLogEntry(`✓ ${data.track} — ${data.artist}`, "success");
        } else if (data.status === "error") {
            markTrackError(data);
            addLogEntry(`✗ ${data.track} — ${data.error || "failed"}`, "error");
        } else if (data.status === "complete") {
            evtSource.close();
            showComplete(data);
        } else if (data.status === "fatal_error") {
            evtSource.close();
            showError(data.error || "Download failed");
        }
    };

    evtSource.onerror = () => {
        evtSource.close();
    };
}

function updateProgressUI(data) {
    document.getElementById("progress-count").textContent = `${data.current} / ${data.total}`;
    document.getElementById("progress-bar").style.width = `${(data.current / data.total) * 100}%`;
    document.getElementById("progress-track").textContent = data.track;
    document.getElementById("progress-artist").textContent = data.artist;

    if (data.cover_url) {
        document.getElementById("progress-cover").src = data.cover_url;
    }
}

function findTrackRow(trackName, artistName) {
    const items = document.querySelectorAll(".track-item");
    for (const item of items) {
        if (item.dataset.title === trackName && item.dataset.artist === artistName) {
            return item;
        }
    }
    return null;
}

function markTrackDownloading(data) {
    const row = findTrackRow(data.track, data.artist);
    if (!row) return;

    row.classList.remove("is-done", "is-error");
    row.classList.add("is-downloading");

    const badge = row.querySelector(".track-status-badge");
    if (badge) {
        badge.textContent = "Downloading";
        badge.className = "track-status-badge downloading";
    }
}

function markTrackDone(data) {
    const row = findTrackRow(data.track, data.artist);
    if (!row) return;

    row.classList.remove("is-downloading", "is-error");
    row.classList.add("is-done");

    const badge = row.querySelector(".track-status-badge");
    if (badge) {
        badge.textContent = "Ready";
        badge.className = "track-status-badge done";
    }

    const checkIcon = row.querySelector(".check-icon");
    if (checkIcon) checkIcon.classList.add("visible");

    // Update track cover art image to song-specific high-res cover
    if (data.cover_url) {
        const img = row.querySelector(".track-cover");
        if (img) img.src = data.cover_url;
    }
}

function markTrackError(data) {
    const row = findTrackRow(data.track, data.artist);
    if (!row) return;

    row.classList.remove("is-downloading", "is-done");
    row.classList.add("is-error");

    const badge = row.querySelector(".track-status-badge");
    if (badge) {
        badge.textContent = "Failed";
        badge.className = "track-status-badge error";
    }

    const errorIcon = row.querySelector(".error-icon");
    if (errorIcon) errorIcon.classList.add("visible");
}

function addLogEntry(text, type = "") {
    const log = document.getElementById("progress-log");
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    entry.textContent = text;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// ---------- Complete ----------

function showComplete(data) {
    document.getElementById("progress-section").classList.add("hidden");
    document.getElementById("complete-section").classList.remove("hidden");
    document.getElementById("complete-summary").textContent =
        "Your playlist has been downloaded and packaged into a ZIP file.";
    document.getElementById("complete-section").scrollIntoView({ behavior: "smooth", block: "center" });
}

function downloadZip() {
    if (!currentSessionId) return;
    window.location.href = `/api/file/${currentSessionId}`;
}

// ---------- Reset ----------

function resetApp() {
    currentPlaylistUrl = "";
    currentSessionId = "";
    document.getElementById("playlist-url").value = "";
    document.getElementById("playlist-section").classList.add("hidden");
    document.getElementById("progress-section").classList.add("hidden");
    document.getElementById("complete-section").classList.add("hidden");
    document.getElementById("download-btn").disabled = false;
    document.getElementById("download-btn").querySelector("span").textContent = "Download All";
    document.getElementById("hero-section").scrollIntoView({ behavior: "smooth", block: "start" });
}
