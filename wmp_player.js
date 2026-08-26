/* Frutiger Aero Windows Media Player Style Floating Bubble Player */

let wmpPlaylistTracks = [];
let wmpCurrentTrackIndex = 0;
let wmpIsShuffle = false;
let wmpAudio = new Audio();

const state = {
    power: true,
    playing: false,
    volume: 4,
    muted: false,
    trackIndex: 0,
};

const defaultTracks = [
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

function initWmpPlayer() {
    setupWmpEvents();
    renderVolume();

    fetch('/api/trending')
        .then(res => res.json())
        .then(data => {
            if (data.tracks && data.tracks.length > 0) {
                loadWmpPlaylist(data.tracks, data.cover_url);
            } else {
                loadWmpPlaylist(defaultTracks);
            }
        })
        .catch(err => {
            console.log("Trending load note:", err);
            loadWmpPlaylist(defaultTracks);
        });
}

function loadWmpPlaylist(tracks, defaultCover) {
    wmpPlaylistTracks = tracks.map((t, idx) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        cover_url: t.cover_url || defaultCover || "/real_cd.png",
        duration_ms: t.duration_ms,
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
        if (autoPlay) {
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
    if (wmpPlaylistTracks.length === 0) return;
    const prev = (state.trackIndex - 1 + wmpPlaylistTracks.length) % wmpPlaylistTracks.length;
    wmpSetTrack(prev, true);
}

function wmpToggleShuffle() {
    wmpIsShuffle = !wmpIsShuffle;
    const satShuf = document.getElementById('satShuf');
    if (satShuf) satShuf.classList.toggle('active', wmpIsShuffle);
}

function wmpSetVolLevel(lvl) {
    state.volume = lvl;
    state.muted = false;
    wmpAudio.volume = lvl / 5;
    renderVolume();
}

function wmpToggleMenu() {
    const drawer = document.getElementById('orbDrawer');
    const list = document.getElementById('orbDrawerList');
    if (!drawer || !list) return;

    list.innerHTML = '';
    wmpPlaylistTracks.forEach((t, i) => {
        const item = document.createElement('div');
        item.className = `aero-drawer-item ${i === state.trackIndex ? 'active' : ''}`;
        item.textContent = `${t.title} — ${t.artist}`;
        item.onclick = () => {
            wmpSetTrack(i, true);
            drawer.classList.remove('show');
        };
        list.appendChild(item);
    });

    drawer.classList.toggle('show');
}

function wmpMinimize() {
    const widget = document.getElementById('wmp-widget');
    if (widget) {
        widget.classList.add('absorbed');
        setTimeout(() => {
            widget.classList.remove('absorbed');
        }, 3000);
    }
}

function wmpExplodeDestroy() {
    const widget = document.getElementById('wmp-widget');
    if (widget) {
        widget.classList.add('exploding');
        setTimeout(() => {
            widget.style.display = 'none';
        }, 500);
    }
}

function setupWmpEvents() {
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

function formatTime(s) {
    if (isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

document.addEventListener('DOMContentLoaded', () => {
    initWmpPlayer();
});
