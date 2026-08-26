# 🎵 Spotiload — Spotify Playlist Downloader

A web application that downloads Spotify playlists as high-quality MP3 files with full metadata and album art.

## Features

- **Playlist Fetching** — Paste any public Spotify playlist URL to preview all tracks
- **MP3 Download** — Downloads audio from YouTube in 320kbps MP3 format
- **Full Metadata** — Embeds title, artist, album, track number, release date, and album cover art into each MP3
- **Real-time Progress** — Live progress bar with per-track status updates via Server-Sent Events
- **ZIP Packaging** — All tracks are bundled into a single downloadable ZIP file
- **Premium UI** — Dark theme with glassmorphism, animated gradients, and micro-animations

## Tech Stack

| Layer    | Technology                                      |
| -------- | ----------------------------------------------- |
| Backend  | Python, Flask                                   |
| Frontend | HTML, CSS, JavaScript                           |
| APIs     | Spotify Web API (via `spotipy`)                 |
| Download | `yt-dlp` (YouTube search + audio download)      |
| Audio    | `ffmpeg` (format conversion), `mutagen` (ID3 tags) |

## Prerequisites

1. **Python 3.9+** — [python.org](https://www.python.org/downloads/)
2. **ffmpeg** — [ffmpeg.org](https://ffmpeg.org/download.html) (must be on your PATH)
3. **Spotify Developer App** (free):
   - Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   - Click "Create App"
   - Set any name/description, set Redirect URI to `http://localhost:8888/callback`
   - Copy the **Client ID** and **Client Secret**

## Setup

```bash
# 1. Clone / navigate to the project
cd spotify-downloader

# 2. Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure Spotify credentials
#    Copy .env.example to .env and fill in your credentials
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux

# 5. Edit .env with your Client ID and Client Secret
```

## Running

```bash
python app.py
```

Open **http://localhost:5000** in your browser.

## How It Works

```
User pastes Spotify playlist URL
        │
        ▼
Spotify API → Fetch playlist metadata (tracks, artists, albums, cover art)
        │
        ▼
For each track:
  1. Search YouTube for "{track name} {artist} audio"
  2. Download best audio stream via yt-dlp
  3. Convert to 320kbps MP3 via ffmpeg
  4. Embed ID3 tags + album cover via mutagen
        │
        ▼
ZIP all MP3 files → Serve download to user
```

## Project Structure

```
spotify-downloader/
├── app.py              # Flask server — routes & API endpoints
├── downloader.py       # Core engine — Spotify, YouTube, MP3 tagging
├── requirements.txt    # Python dependencies
├── .env.example        # Spotify credential template
├── README.md           # This file
├── static/
│   ├── css/style.css   # UI styling (dark theme + glassmorphism)
│   └── js/app.js       # Frontend logic (fetch, SSE, rendering)
├── templates/
│   └── index.html      # Main page template
└── downloads/          # Temporary download directory (auto-created)
```

## Notes

- Only **public playlists** are supported (no login/OAuth required)
- Download speed depends on your internet connection and YouTube availability
- Large playlists may take several minutes
- Downloaded files are temporarily stored on the server and cleaned up after zipping

## License

This project was built as a university group project for educational purposes.
