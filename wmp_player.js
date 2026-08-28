/**
 * wmp_player.js — Controller for Aero Bubble Player System
 * Features:
 * - Starts minimized by default as a floating corner sphere
 * - Click anywhere on the sphere to expand
 * - Floating Next Song Card
 * - Interactive Satellite Orbs (Play, Stop, Prev, Next, Shuffle, Menu)
 * - Volume, Progress Bar, and Drawer List
 */

let wmpPlaylistTracks = [
    {
        id: "demo1",
        title: "Horizon Drift",
        artist: "Late Static",
        cover_url: "/real_cd.png",
        duration_ms: 205000,
        preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
    },
    {
        id: "demo2",
        title: "Frutiger Dreams",
        artist: "Aqua Wave",
        cover_url: "/real_cd.png",
        duration_ms: 184000,
        preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    },
    {
        id: "demo3",
        title: "Cyber Aquatic",
        artist: "Aero-Orbit 2000",
        cover_url: "/real_cd.png",
        duration_ms: 220000,
        preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
    },
    {
        id: "demo4",
        title: "Starlight Promenade",
        artist: "Vista Glass",
        cover_url: "/real_cd.png",
        duration_ms: 195000,
        preview_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
    }
];

let wmpCurrentTrackIndex = 0;
let wmpIsShuffle = false;
const wmpAudio = new Audio();

let state = {
    power: true,
    playing: false,
    trackIndex: 0,
    progress: 0,
    volume: 3,
    muted: false
};

function formatTimeMs(ms) {
    if (!ms || isNaN(ms)) return "0:00";
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function loadWmpPlaylist(tracks, defaultCover) {
    if (!tracks || tracks.length === 0) return;
    wmpPlaylistTracks = tracks.map((t, idx) => ({
        id: t.id || `tr_${idx}`,
        title: t.title || "Track",
        artist: t.artist || "Artist",
        cover_url: t.cover_url || defaultCover || "/real_cd.png",
        duration_ms: t.duration_ms || 180000,
        preview_url: t.preview_url || `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(idx % 15) + 1}.mp3`
    }));

    wmpSetTrack(0, false);
}

function renderTrack() {
    if (!wmpPlaylistTracks[state.trackIndex]) return;
    const t = wmpPlaylistTracks[state.trackIndex];
    const trackTitle = document.getElementById('trackTitle');
    const trackArtist = document.getElementById('trackArtist');
    const thumb = document.getElementById('wmp-thumb');
    const nextSongTitle = document.getElementById('nextSongTitle');

    if (trackTitle) trackTitle.textContent = t.title;
    if (trackArtist) trackArtist.textContent = t.artist;
    if (thumb) {
        thumb.onerror = function() {
            this.onerror = null;
            this.src = '/real_cd.png';
        };
        thumb.src = t.cover_url || '/real_cd.png';
    }

    const nextIdx = (state.trackIndex + 1) % wmpPlaylistTracks.length;
    const nextTrack = wmpPlaylistTracks[nextIdx];
    if (nextSongTitle && nextTrack) {
        nextSongTitle.textContent = `${nextTrack.title} — ${nextTrack.artist}`;
    }
}

function renderVolume() {
    const volBars = document.getElementById('volBars');
    if (!volBars) return;
    [...volBars.children].forEach(bar => {
        const lvl = parseInt(bar.dataset.lvl);
        bar.classList.toggle('on', !state.muted && lvl <= state.volume);
    });
    wmpAudio.muted = state.muted;
}

function setPlaying(playing) {
    state.playing = playing;
    const thumb = document.getElementById('wmp-thumb');
    const playIcon = document.getElementById('satPlayIcon');
    const eq = document.getElementById('orbEq');

    if (thumb) thumb.classList.toggle('playing', playing);
    if (eq) eq.classList.toggle('playing', playing);
    if (playIcon) {
        playIcon.setAttribute('d', playing ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z');
    }
}

function wmpSetTrack(index, autoPlay = true) {
    if (!wmpPlaylistTracks || !wmpPlaylistTracks[index]) return;
    state.trackIndex = index;
    wmpCurrentTrackIndex = index;
    const track = wmpPlaylistTracks[index];

    renderTrack();

    if (track.preview_url) {
        wmpAudio.src = track.preview_url;
        if (autoPlay && state.power) {
            wmpAudio.play().then(() => {
                setPlaying(true);
            }).catch(() => {
                setPlaying(false);
            });
        }
    } else {
        wmpAudio.pause();
        setPlaying(false);
    }
}

function wmpTogglePlay() {
    if (!wmpAudio.src && wmpPlaylistTracks.length > 0) {
        wmpSetTrack(0, true);
        return;
    }
    if (wmpAudio.paused) {
        wmpAudio.play().then(() => {
            setPlaying(true);
        }).catch((err) => {
            console.log("Audio play note:", err);
        });
    } else {
        wmpAudio.pause();
        setPlaying(false);
    }
}

function wmpStop() {
    wmpAudio.pause();
    wmpAudio.currentTime = 0;
    const fill = document.getElementById("progressFill");
    if (fill) fill.style.width = '0%';
    setPlaying(false);
}

function wmpPlayNext() {
    if (wmpPlaylistTracks.length === 0) return;
    if (wmpIsShuffle) {
        const rnd = Math.floor(Math.random() * wmpPlaylistTracks.length);
        wmpSetTrack(rnd, true);
    } else {
        const next = (state.trackIndex + 1) % wmpPlaylistTracks.length;
        wmpSetTrack(next, true);
    }
}

function wmpPlayPrev() {
    if (wmpPlaylistTracks.length === 0) return;
    const prev = (state.trackIndex - 1 + wmpPlaylistTracks.length) % wmpPlaylistTracks.length;
    wmpSetTrack(prev, true);
}

function wmpToggleShuffle() {
    wmpIsShuffle = !wmpIsShuffle;
    const shuffleOrb = document.getElementById('satShuf');
    if (shuffleOrb) {
        shuffleOrb.classList.toggle('active', wmpIsShuffle);
    }
}

function wmpToggleMenu() {
    const drawer = document.getElementById('orbDrawer');
    const drawerList = document.getElementById('orbDrawerList');
    if (!drawer || !drawerList) return;

    drawerList.innerHTML = wmpPlaylistTracks.map((t, i) =>
        `<div onclick="wmpSetTrack(${i}, true); document.getElementById('orbDrawer').classList.remove('show');" class="${i === state.trackIndex ? 'active' : ''}">${t.title} — ${t.artist}</div>`
    ).join('');

    drawer.classList.toggle('show');
}

function wmpSetVolLevel(lvl) {
    state.muted = false;
    state.volume = parseInt(lvl);
    wmpAudio.volume = state.volume / 5;
    renderVolume();
}

function wmpMinimize() {
    const widget = document.getElementById('wmp-widget');
    if (widget) {
        widget.classList.toggle('minimized');
    }
}

function wmpExplodeDestroy() {
    const nextCard = document.getElementById('nextCard');
    const mainOrb = document.getElementById('mainOrb');
    const system = document.getElementById('wmp-widget');
    const satellites = document.querySelectorAll('.aero-satellite-orb');

    wmpAudio.pause();
    setPlaying(false);

    if (nextCard) nextCard.classList.add('exploding-sat');
    if (mainOrb) mainOrb.classList.add('exploding-main');

    satellites.forEach((sat, index) => {
        setTimeout(() => {
            sat.classList.add('exploding-sat');
        }, 100 + index * 70);
    });

    setTimeout(() => {
        if (system) system.style.display = 'none';
    }, 700);
}

function initWmpPlayer() {
    wmpAudio.addEventListener("timeupdate", () => {
        if (wmpAudio.duration) {
            const pct = (wmpAudio.currentTime / wmpAudio.duration) * 100;
            const fill = document.getElementById("progressFill");
            if (fill) fill.style.width = pct + "%";

            const timeCurr = formatTimeMs(wmpAudio.currentTime * 1000);
            const timeTotal = formatTimeMs(wmpAudio.duration * 1000);

            const currElem = document.getElementById("orbTimeCurr");
            const totalElem = document.getElementById("orbTimeTotal");
            if (currElem) currElem.textContent = timeCurr;
            if (totalElem) totalElem.textContent = timeTotal;
        }
    });

    wmpAudio.addEventListener("ended", () => {
        wmpPlayNext();
    });

    // Expand on clicking main orb if currently minimized
    const mainOrb = document.getElementById('mainOrb');
    const widget = document.getElementById('wmp-widget');
    if (mainOrb && widget) {
        mainOrb.addEventListener('click', (e) => {
            if (widget.classList.contains('minimized')) {
                widget.classList.remove('minimized');
                e.stopPropagation();
            }
        });
    }

    // Set initial track & volume
    wmpSetTrack(0, false);
    renderVolume();

    // Fetch trending songs for the player
    fetch('/api/trending')
        .then(res => res.json())
        .then(data => {
            if (data.tracks && data.tracks.length > 0) {
                loadWmpPlaylist(data.tracks, data.cover_url);
            }
        })
        .catch(err => {
            console.log("Trending load note:", err);
        });
}

document.addEventListener("DOMContentLoaded", () => {
    initWmpPlayer();
});
