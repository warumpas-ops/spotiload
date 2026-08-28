/**
 * wmp_player.js — Controller for Aero Bubble Player System with Floating Next Song Card & Audio Stream Engine
 */

// DEFAULT PLAYABLE TRACKS
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
let isMinimized = false;
const wmpAudio = new Audio();

let state = { power: true, playing: false, trackIndex: 0, progress: 0, volume: 3, muted: false };

function setupWmpEvents() {
    const mainOrb = document.getElementById('mainOrb');
    if (mainOrb) {
        mainOrb.addEventListener('click', (e) => {
            const widget = document.getElementById('wmp-widget');
            if (widget && widget.classList.contains('minimized')) {
                e.stopPropagation();
                widget.classList.remove('minimized');
            }
        });
    }

    wmpAudio.addEventListener('timeupdate', () => {
        if (!wmpAudio.duration) return;
        const pct = (wmpAudio.currentTime / wmpAudio.duration) * 100;
        const fill = document.getElementById('progressFill');
        const curr = document.getElementById('orbTimeCurr');
        const tot = document.getElementById('orbTimeTotal');

        if (fill) fill.style.width = `${pct}%`;
        if (curr) curr.textContent = formatTime(wmpAudio.currentTime);
        if (tot) tot.textContent = formatTime(wmpAudio.duration);
    });

    wmpAudio.addEventListener('ended', () => {
        wmpPlayNext();
    });
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

    // Main Orb Click Handler: Expand if minimized
    const mainOrb = document.getElementById('mainOrb');
    const bubbleSystem = document.getElementById('wmp-widget');

    if (mainOrb && bubbleSystem) {
        mainOrb.addEventListener('click', (e) => {
            if (isMinimized) {
                bubbleSystem.classList.remove('minimized');
                isMinimized = false;
                e.stopPropagation();
            }
        });
    }

    wmpSetTrack(0, false);
    renderVolume();
}

function formatTimeMs(ms) {
    if (!ms || isNaN(ms)) return "0:00";
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function loadWmpPlaylist(tracks, defaultCover) {
    wmpPlaylistTracks = tracks.map((t, idx) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        cover_url: t.cover_url || defaultCover || "/real_cd.png",
        duration_ms: t.duration_ms,
        // Fallback playable audio stream if Spotify preview stream is missing
        preview_url: t.preview_url || `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${(idx % 15) + 1}.mp3`
    }));

    if (wmpPlaylistTracks.length > 0) {
        wmpSetTrack(0, false);
    }
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
        if (t.cover_url) {
            thumb.src = t.cover_url;
        } else {
            thumb.src = '/real_cd.png';
        }
    }

    // UPDATE FLOATING NEXT SONG CARD INDICATOR!
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
        const lvl = +bar.dataset.lvl;
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
            }).catch(() => {});
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
    }
}

function wmpToggleShuffle() {
    wmpIsShuffle = !wmpIsShuffle;
    const shuffleOrb = document.getElementById('satShuf');
    if (shuffleOrb) {
        shuffleOrb.classList.toggle('active', wmpIsShuffle);
    }
}

function wmpToggleMenu() {
    if (!state.power) return;
    const drawer = document.getElementById('orbDrawer');
    const drawerList = document.getElementById('orbDrawerList');
    if (!drawer || !drawerList) return;

    drawerList.innerHTML = wmpPlaylistTracks.map((t, i) =>
        `<div onclick="wmpSetTrack(${i}, true); document.getElementById('orbDrawer').classList.remove('show');" class="${i === state.trackIndex ? 'active' : ''}">${t.title} — ${t.artist}</div>`
    ).join('');

    drawer.classList.toggle('show');
}

function wmpSetVolLevel(lvl) {
    if (!state.power) return;
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

// SEQUENTIAL EXPLOSION DESTRUCTION ANIMATION ON CLICKING 'X' CLOSE
function wmpExplodeDestroy() {
    const nextCard = document.getElementById('nextCard');

    wmpAudio.pause();
    setPlaying(false);

    if (nextCard) nextCard.classList.add('exploding-sat');
    if (mainOrb) mainOrb.classList.add('exploding-main');

    satellites.forEach((sat, index) => {
        if (!sat) return;
        setTimeout(() => {
            sat.classList.add('exploding-sat');
        }, 150 + index * 90);
    });

    setTimeout(() => {
        if (system) system.style.display = 'none';
    }, 900);
}

document.addEventListener("DOMContentLoaded", () => {
    initWmpPlayer();
});
