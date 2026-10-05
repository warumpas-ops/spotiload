/**
 * wmp_player.js — Controller for Aero Bubble Player System
 * Features:
 * - Plays songs the user is currently downloading or has downloaded
 * - Single track download -> plays that track immediately
 * - Playlist download -> plays tracks as they finish, lets user skip through queue
 * - Interactive Satellite Orbs (Play, Stop, Prev, Next, Shuffle, Menu)
 * - Rotating CD and Frutiger Aero Equalizer visualizer
 */

let wmpPlaylistTracks = [];
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
        preview_url: t.preview_url || null // Never use fake demo audio!
    }));

    state.trackIndex = 0;
    wmpCurrentTrackIndex = 0;
    renderTrack();
}

function renderTrack() {
    const trackTitle = document.getElementById('trackTitle');
    const trackArtist = document.getElementById('trackArtist');
    const thumb = document.getElementById('wmp-thumb');
    const nextSongTitle = document.getElementById('nextSongTitle');

    if (!wmpPlaylistTracks || wmpPlaylistTracks.length === 0 || !wmpPlaylistTracks[state.trackIndex]) {
        if (trackTitle) trackTitle.textContent = "Spotiload Player";
        if (trackArtist) trackArtist.textContent = "Waiting for download...";
        if (thumb) thumb.src = '/real_cd.png';
        if (nextSongTitle) nextSongTitle.textContent = "Queue is empty";
        return;
    }

    const t = wmpPlaylistTracks[state.trackIndex];

    if (trackTitle) trackTitle.textContent = t.title;
    if (trackArtist) {
        if (t.preview_url) {
            trackArtist.textContent = t.artist;
        } else {
            trackArtist.textContent = `${t.artist} (Downloading...)`;
        }
    }

    if (thumb) {
        thumb.onerror = function() {
            this.onerror = null;
            this.src = '/real_cd.png';
        };
        thumb.src = t.cover_url || '/real_cd.png';
    }

    if (wmpPlaylistTracks.length > 1) {
        const nextIdx = (state.trackIndex + 1) % wmpPlaylistTracks.length;
        const nextTrack = wmpPlaylistTracks[nextIdx];
        if (nextSongTitle && nextTrack) {
            const status = nextTrack.preview_url ? "✓ Ready" : "⏳ Downloading";
            nextSongTitle.textContent = `${nextTrack.title} — ${nextTrack.artist} (${status})`;
        }
    } else {
        if (nextSongTitle) nextSongTitle.textContent = "Single Track Mode";
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
        if (wmpAudio.src !== track.preview_url) {
            wmpAudio.src = track.preview_url;
        }
        if (autoPlay && state.power) {
            wmpAudio.play().then(() => {
                setPlaying(true);
            }).catch((err) => {
                console.log("Audio play note:", err);
                setPlaying(false);
            });
        }
    } else {
        wmpAudio.pause();
        setPlaying(false);
        const fill = document.getElementById("progressFill");
        if (fill) fill.style.width = '0%';
        const currElem = document.getElementById("orbTimeCurr");
        if (currElem) currElem.textContent = "Wait";
    }
}

/**
 * Called when a downloaded track becomes available.
 * Updates the playlist entry with the real MP3 stream or blob URL.
 */
function wmpUpdateTrackAudio(index, url, autoPlay = true) {
    if (!wmpPlaylistTracks || !wmpPlaylistTracks[index]) {
        if (window.currentPlaylistData && window.currentPlaylistData.tracks && window.currentPlaylistData.tracks[index]) {
            loadWmpPlaylist(window.currentPlaylistData.tracks, window.currentPlaylistData.cover_url);
        }
    }
    if (!wmpPlaylistTracks || !wmpPlaylistTracks[index]) return;

    wmpPlaylistTracks[index].preview_url = url;

    // If currently on this track: play it now!
    if (index === state.trackIndex) {
        renderTrack();
        wmpSetTrack(index, autoPlay);
    } else if (!state.playing && autoPlay) {
        // If player is idle and this is the first track ready, switch to it and play!
        wmpSetTrack(index, true);
    } else {
        // Update next song card in case next track became ready
        renderTrack();
    }
}

function wmpTogglePlay() {
    if (wmpPlaylistTracks.length === 0) {
        const trackArtist = document.getElementById('trackArtist');
        if (trackArtist) trackArtist.textContent = "Download a song first!";
        return;
    }
    const currentTrack = wmpPlaylistTracks[state.trackIndex];
    if (!currentTrack || !currentTrack.preview_url) {
        // Find the first track that is ready!
        const readyIdx = wmpPlaylistTracks.findIndex(t => !!t.preview_url);
        if (readyIdx !== -1) {
            wmpSetTrack(readyIdx, true);
            return;
        }
        const trackArtist = document.getElementById('trackArtist');
        if (trackArtist) trackArtist.textContent = "Downloading... please wait!";
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

    if (wmpPlaylistTracks.length === 0) {
        drawerList.innerHTML = `<div style="padding: 10px; color: rgba(255,255,255,0.7); text-align: center;">No tracks queued.<br>Download songs to play!</div>`;
    } else {
        drawerList.innerHTML = wmpPlaylistTracks.map((t, i) => {
            const isReady = !!t.preview_url;
            const badge = isReady ? '▶️ Ready' : '⏳ Downloading';
            return `<div onclick="wmpSetTrack(${i}, true); document.getElementById('orbDrawer').classList.remove('show');" class="${i === state.trackIndex ? 'active' : ''}">
                <span>${t.title} — ${t.artist}</span>
                <small style="opacity: 0.75; font-size: 10px; margin-left: 8px;">${badge}</small>
            </div>`;
        }).join('');
    }

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

    // Set initial display (clean, no fake demo songs)
    renderTrack();
    renderVolume();
}

document.addEventListener("DOMContentLoaded", () => {
    initWmpPlayer();
});
