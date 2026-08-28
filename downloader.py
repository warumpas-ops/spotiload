"""
downloader.py — High-speed parallel download engine with automatic retries, MusicBrainz Picard-style multi-source cover art resolver, and Pillow JPEG normalization
Handles: Spotify scraping, parallel YouTube downloads (yt-dlp), multi-source artwork resolution (Spotify + Deezer + iTunes + MusicBrainz/CAA), Pillow JPEG conversion, and ID3v2.3 MP3 tagging.
"""

import sys
import io

# Ensure UTF-8 output on Windows
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import os
import re
import json
import uuid
import time
import shutil
import zipfile
import requests
import yt_dlp
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TYER, TDRC, TRCK, TCON, APIC, ID3NoHeaderError

try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception as e:
    print(f"static_ffmpeg note: {e}")



HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def sanitize_text(text: str) -> str:
    """Clean up non-breaking spaces and whitespace."""
    if not text:
        return ""
    return text.replace("\u00a0", " ").replace("\xa0", " ").strip()


def clean_query_title(title: str) -> str:
    """Clean up track title for music database queries (remove feat., remasters, etc.)."""
    t = sanitize_text(title)
    t = re.sub(r'[\(\[\{].*?[\)\]\}]', '', t)
    t = re.sub(r'-\s*(Remastered|Bonus Track|Live|Radio Edit).*$', '', t, flags=re.IGNORECASE)
    return t.strip()


def process_cover_image(image_bytes: bytes) -> bytes:
    """
    Convert any image (WebP, PNG, GIF, BMP) into a clean, standardized high-res JPEG.
    Ensures 100% rendering compatibility in iTunes, Apple Music, Windows File Explorer, and mobile players.
    """
    if not image_bytes:
        return b""
    try:
        buf = io.BytesIO(image_bytes)
        img = Image.open(buf)
        img = img.convert("RGB")
        img.thumbnail((800, 800), Image.Resampling.LANCZOS)
        out_buf = io.BytesIO()
        img.save(out_buf, format="JPEG", quality=95)
        return out_buf.getvalue()
    except Exception as e:
        print(f"Image processing note: {e}")
        return image_bytes


def extract_playlist_id(url: str) -> str:
    """Extract the playlist ID from various Spotify URL formats."""
    patterns = [
        r"spotify\.com/playlist/([a-zA-Z0-9]+)",
        r"spotify:playlist:([a-zA-Z0-9]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    raise ValueError("Invalid Spotify playlist URL. Make sure it looks like: https://open.spotify.com/playlist/...")


def _get_anonymous_token() -> str:
    """Get an anonymous access token from Spotify's web player if available."""
    session = requests.Session()
    session.headers.update(HEADERS)
    try:
        session.get("https://open.spotify.com/", timeout=10)
        resp = session.get(
            "https://open.spotify.com/get_access_token?reason=transport&productType=web_player",
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("accessToken")
            if token:
                return token
    except Exception:
        pass
    raise RuntimeError("Could not get anonymous Spotify token")


def _fetch_with_token(playlist_id: str, token: str) -> dict:
    """Fetch playlist data using an anonymous access token."""
    api_url = f"https://api.spotify.com/v1/playlists/{playlist_id}"
    resp = requests.get(
        api_url,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": HEADERS["User-Agent"],
        },
        params={"fields": "name,description,images,owner.display_name,tracks.total,tracks.items(track(id,name,artists,album(name,images,release_date),duration_ms,track_number,preview_url)),tracks.next"},
        timeout=20,
    )

    if resp.status_code != 200:
        raise RuntimeError(f"Spotify API returned {resp.status_code}")

    return resp.json()


def _scrape_embed_page(playlist_id: str) -> dict:
    """Fallback: scrape Spotify embed page for playlist data."""
    embed_url = f"https://open.spotify.com/embed/playlist/{playlist_id}"
    resp = requests.get(embed_url, headers=HEADERS, timeout=15)

    if resp.status_code != 200:
        raise RuntimeError(f"Could not load Spotify embed page (status {resp.status_code})")

    match = re.search(
        r'<script\s+id="__NEXT_DATA__"\s+type="application/json">\s*(.*?)\s*</script>',
        resp.text,
        re.DOTALL,
    )
    if match:
        return json.loads(match.group(1))

    match = re.search(r'"entity":\s*(\{.*?"tracks".*?\})\s*[,}]', resp.text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    raise RuntimeError("Could not parse Spotify page data. The playlist might be private.")


def _parse_api_response(raw: dict) -> dict:
    """Parse Spotify API response into track list."""
    tracks = []
    track_items = raw.get("tracks", {}).get("items", [])

    for item in track_items:
        track = item.get("track")
        if not track or not track.get("id"):
            continue

        artists = ", ".join(sanitize_text(a["name"]) for a in track.get("artists", []))
        album = track.get("album", {})
        images = album.get("images", [])
        cover_url = images[0]["url"] if images else None

        tracks.append({
            "id": track["id"],
            "title": sanitize_text(track.get("name", "")),
            "artist": artists,
            "album": sanitize_text(album.get("name", "")),
            "release_date": album.get("release_date", ""),
            "track_number": track.get("track_number", 1),
            "duration_ms": track.get("duration_ms", 0),
            "cover_url": cover_url,
        })

    playlist_images = raw.get("images", [])
    cover_url = playlist_images[0]["url"] if playlist_images else None

    return {
        "name": sanitize_text(raw.get("name", "Playlist")),
        "description": sanitize_text(raw.get("description", "")),
        "owner": sanitize_text(raw.get("owner", {}).get("display_name", "Unknown")),
        "cover_url": cover_url,
        "total_tracks": len(tracks),
        "tracks": tracks,
    }


def _parse_embed_data(raw: dict) -> dict:
    """Parse embed page __NEXT_DATA__ into track list."""
    tracks = []

    try:
        props = raw.get("props", {}).get("pageProps", {})
        state = props.get("state", {}).get("data", {})
        entity = state.get("entity", {})

        playlist_name = sanitize_text(entity.get("name", "Playlist"))
        playlist_cover = None
        if entity.get("coverArt", {}).get("sources"):
            playlist_cover = entity["coverArt"]["sources"][0].get("url")
        elif entity.get("images"):
            playlist_cover = entity["images"][0].get("url")

        track_list = entity.get("trackList", [])

        for i, t in enumerate(track_list):
            title = sanitize_text(t.get("title", ""))
            subtitle = sanitize_text(t.get("subtitle", ""))
            uid = t.get("uri", "").split(":")[-1] if t.get("uri") else str(i)
            cover = None
            if t.get("albumCoverArt", {}).get("sources"):
                cover = t["albumCoverArt"]["sources"][0].get("url")

            tracks.append({
                "id": uid,
                "title": title,
                "artist": subtitle,
                "album": sanitize_text(t.get("albumName", "")),
                "release_date": "",
                "track_number": i + 1,
                "duration_ms": t.get("duration", 0),
                "cover_url": cover,
            })

        return {
            "name": playlist_name,
            "description": "",
            "owner": sanitize_text(entity.get("subtitle", "Unknown")),
            "cover_url": playlist_cover,
            "total_tracks": len(tracks),
            "tracks": tracks,
        }
    except (KeyError, TypeError, IndexError):
        raise RuntimeError("Failed to parse embed page data structure")


def fetch_playlist(playlist_url: str) -> dict:
    """Fetch playlist metadata and tracks from Spotify."""
    playlist_id = extract_playlist_id(playlist_url)
    result = None

    # Method 1: Anonymous API
    try:
        token = _get_anonymous_token()
        raw = _fetch_with_token(playlist_id, token)
        parsed = _parse_api_response(raw)
        if parsed["tracks"]:
            next_url = raw.get("tracks", {}).get("next")
            while next_url:
                resp = requests.get(
                    next_url,
                    headers={"Authorization": f"Bearer {token}", "User-Agent": HEADERS["User-Agent"]},
                    timeout=15,
                )
                if resp.status_code != 200:
                    break
                page = resp.json()
                for item in page.get("items", []):
                    track = item.get("track")
                    if not track or not track.get("id"):
                        continue
                    artists = ", ".join(sanitize_text(a["name"]) for a in track.get("artists", []))
                    album = track.get("album", {})
                    images = album.get("images", [])
                    cover_url = images[0]["url"] if images else None
                    parsed["tracks"].append({
                        "id": track["id"],
                        "title": sanitize_text(track.get("name", "")),
                        "artist": artists,
                        "album": sanitize_text(album.get("name", "")),
                        "release_date": album.get("release_date", ""),
                        "track_number": track.get("track_number", 1),
                        "duration_ms": track.get("duration_ms", 0),
                        "cover_url": cover_url,
                    })
                next_url = page.get("next")
            parsed["total_tracks"] = len(parsed["tracks"])
            result = parsed
    except Exception:
        pass

    # Method 2: Embed page
    if not result:
        try:
            raw = _scrape_embed_page(playlist_id)
            result = _parse_embed_data(raw)
        except Exception:
            pass

    if not result:
        raise RuntimeError("Could not fetch playlist data. Make sure the playlist is public.")

    # Assign default cover art fallback for preview & enrich with direct playable MP3 preview URLs
    playlist_cover = result.get("cover_url")
    for track in result["tracks"]:
        if not track.get("cover_url") and playlist_cover:
            track["cover_url"] = playlist_cover

    # Fast parallel preview URL & high-res album cover art enrichment (only if missing)
    try:
        def _fetch_single_enrichment(t):
            cov_url = t.get("cover_url")
            prev_url = t.get("preview_url")
            
            # If cover and preview already exist from Spotify, return instantly with 0 network calls!
            if cov_url and prev_url:
                return prev_url, cov_url
                
            title = clean_query_title(t.get("title", ""))
            artist = t.get("artist", "")

            if not prev_url:
                try:
                    r = requests.get(f"https://api.deezer.com/search?q={artist} {title}", headers=HEADERS, timeout=1.5).json()
                    if r.get("data") and len(r["data"]) > 0:
                        item = r["data"][0]
                        prev_url = item.get("preview")
                        if not cov_url:
                            album = item.get("album", {})
                            cov_url = album.get("cover_xl") or album.get("cover_big") or album.get("cover_medium")
                except Exception:
                    pass

            if not cov_url:
                try:
                    r = requests.get(f"https://itunes.apple.com/search?term={artist} {title}&entity=song&limit=1", headers=HEADERS, timeout=1.5).json()
                    if r.get("results") and len(r["results"]) > 0:
                        cov_url = r["results"][0].get("artworkUrl100", "").replace("100x100bb", "600x600bb")
                except Exception:
                    pass

            return prev_url, cov_url

        # Limit enrichment to first 25 tracks only with 4 fast workers
        target_tracks = result["tracks"][:25]
        with ThreadPoolExecutor(max_workers=4) as executor:
            enrichments = list(executor.map(_fetch_single_enrichment, target_tracks))

        for t, (p, c) in zip(target_tracks, enrichments):
            if p:
                t["preview_url"] = p
            if c:
                t["cover_url"] = c
    except Exception as e:
        print("Enrichment note:", e)

    return result


def get_song_specific_cover(track: dict, yt_thumbnail_url: str = None, default_cover_url: str = None) -> str:
    """
    MusicBrainz Picard-style multi-source official album artwork resolver:
    1. Spotify track-specific cover art (if distinct from playlist default)
    2. Deezer API search (1000x1000 official album cover)
    3. iTunes Search API (1400x1400 / 600x600 official Apple Music artwork)
    4. MusicBrainz + Cover Art Archive (official MusicBrainz release artwork)
    5. YouTube video thumbnail (fallback if no official music store artwork exists)
    6. Playlist cover art (final fallback)
    """
    title = sanitize_text(track.get("title", ""))
    artist = sanitize_text(track.get("artist", ""))
    clean_t = clean_query_title(title)

    # 1. Spotify track-specific cover if present and distinct from playlist default
    track_cover = track.get("cover_url")
    if track_cover and track_cover != default_cover_url:
        return track_cover

    # 2. Deezer API Search (1000x1000 HD official album cover)
    if clean_t:
        try:
            resp = requests.get(
                "https://api.deezer.com/search",
                params={"q": f"{clean_t} {artist}".strip()},
                headers=HEADERS,
                timeout=3,
            )
            if resp.status_code == 200:
                items = resp.json().get("data", [])
                if items:
                    for item in items:
                        album_info = item.get("album", {})
                        cover = album_info.get("cover_xl") or album_info.get("cover_big")
                        if cover:
                            if not track.get("album") and album_info.get("title"):
                                track["album"] = sanitize_text(album_info["title"])
                            return cover
        except Exception:
            pass

    # 3. iTunes Search API (1400x1400 / 600x600 official Apple Music artwork)
    if clean_t:
        try:
            resp = requests.get(
                "https://itunes.apple.com/search",
                params={"term": f"{clean_t} {artist}".strip(), "entity": "song", "limit": 3},
                headers=HEADERS,
                timeout=3,
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    for item in results:
                        artwork = item.get("artworkUrl100")
                        if artwork:
                            if not track.get("album") and item.get("collectionName"):
                                track["album"] = sanitize_text(item["collectionName"])
                            if not track.get("release_date") and item.get("releaseDate"):
                                track["release_date"] = item["releaseDate"][:10]
                            if not track.get("genre") and item.get("primaryGenreName"):
                                track["genre"] = item["primaryGenreName"]
                            return artwork.replace("100x100bb", "1000x1000bb")
        except Exception:
            pass

    # 4. MusicBrainz + Cover Art Archive (CAA)
    if clean_t and artist:
        try:
            mb_url = "https://musicbrainz.org/ws/2/recording"
            mb_params = {"query": f'artist:"{artist}" AND recording:"{clean_t}"', "fmt": "json", "limit": 1}
            resp = requests.get(mb_url, params=mb_params, headers=HEADERS, timeout=3)
            if resp.status_code == 200:
                recordings = resp.json().get("recordings", [])
                if recordings:
                    releases = recordings[0].get("releases", [])
                    if releases:
                        mbid = releases[0]["id"]
                        caa_url = f"https://coverartarchive.org/release/{mbid}/front-500"
                        r2 = requests.head(caa_url, headers=HEADERS, timeout=3, allow_redirects=True)
                        if r2.status_code == 200:
                            if not track.get("album") and releases[0].get("title"):
                                track["album"] = sanitize_text(releases[0]["title"])
                            return r2.url
        except Exception:
            pass

    # 5. YouTube video thumbnail (fallback if no official music store artwork exists)
    if yt_thumbnail_url:
        return yt_thumbnail_url

    # 6. Final fallback to playlist default cover art
    return track_cover or default_cover_url or ""


def search_and_download(track: dict, output_dir: str) -> tuple:
    """
    Search YouTube for a track, download as MP3, and return (mp3_path, yt_thumbnail_url).
    """
    search_query = f"{track['title']} {track['artist']} audio"
    safe_filename = re.sub(r'[<>:"/\\|?*]', "_", f"{track['artist']} - {track['title']}")
    safe_filename = safe_filename[:200]
    output_path = os.path.join(output_dir, safe_filename)

    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_path + ".%(ext)s",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "320",
            }
        ],
        "quiet": True,
        "no_warnings": True,
        "default_search": "ytsearch1",
        "noplaylist": True,
        "socket_timeout": 20,
        "retries": 10,
        "fragment_retries": 10,
        "file_access_retries": 5,
        "extractor_args": {
            "youtube": {
                "player_client": ["mweb", "ios", "android"],
            }
        },
        "http_headers": HEADERS,
    }

    yt_thumbnail = None
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(search_query, download=True)
        if info:
            if "entries" in info and info["entries"]:
                entry = info["entries"][0]
                yt_thumbnail = entry.get("thumbnail")
            else:
                yt_thumbnail = info.get("thumbnail")

    mp3_path = output_path + ".mp3"
    if not os.path.exists(mp3_path):
        for f in os.listdir(output_dir):
            if f.startswith(safe_filename) and f.endswith(".mp3"):
                mp3_path = os.path.join(output_dir, f)
                break

    if not os.path.exists(mp3_path):
        raise FileNotFoundError(f"Download failed for: {track['title']}")

    return mp3_path, yt_thumbnail


def tag_mp3(filepath: str, track: dict, cover_url: str = None) -> None:
    """Embed ID3v2.3 metadata (encoding=1 UTF-16) and Pillow-normalized JPEG cover art into an MP3 file."""
    try:
        try:
            tags = ID3(filepath)
        except ID3NoHeaderError:
            tags = ID3()

        # Use encoding=1 (UTF-16 with BOM) for ID3v2.3 full Unicode support
        tags.add(TIT2(encoding=1, text=sanitize_text(track.get("title", ""))))
        tags.add(TPE1(encoding=1, text=sanitize_text(track.get("artist", ""))))
        if track.get("album"):
            tags.add(TALB(encoding=1, text=sanitize_text(track.get("album", ""))))

        if track.get("track_number"):
            tags.add(TRCK(encoding=1, text=str(track["track_number"])))

        release_date = str(track.get("release_date", "")).strip()
        if release_date:
            tags.add(TDRC(encoding=1, text=release_date))
            year = release_date.split("-")[0]
            if year.isdigit():
                tags.add(TYER(encoding=1, text=year))

        if track.get("genre"):
            tags.add(TCON(encoding=1, text=str(track["genre"])))

        # Download & normalize cover art to clean baseline JPEG via Pillow
        if cover_url:
            try:
                resp = requests.get(cover_url, headers=HEADERS, timeout=12)
                if resp.status_code == 200 and resp.content:
                    jpeg_bytes = process_cover_image(resp.content)
                    if jpeg_bytes:
                        tags.add(
                            APIC(
                                encoding=0,
                                mime="image/jpeg",
                                type=3,  # Front cover
                                desc="",
                                data=jpeg_bytes,
                            )
                        )
            except Exception as e:
                print(f"Note embedding cover for '{track.get('title')}': {e}")

        tags.save(filepath, v2_version=3)
    except Exception as e:
        print(f"Error tagging {filepath}: {e}")


def _process_single_track(item: tuple, download_dir: str, default_cover: str, progress_callback) -> str:
    """Helper worker function for parallel thread execution with automatic retry."""
    idx, total, track = item
    status = {
        "current": idx + 1,
        "total": total,
        "track": track["title"],
        "artist": track["artist"],
        "cover_url": track.get("cover_url", ""),
        "status": "downloading",
    }

    if progress_callback:
        progress_callback(status)

    last_error = None
    for attempt in range(3):  # Automatic retry up to 3 times on connection timeouts
        try:
            mp3_path, yt_thumb = search_and_download(track, download_dir)
            specific_cover = get_song_specific_cover(track, yt_thumbnail_url=yt_thumb, default_cover_url=default_cover)
            tag_mp3(mp3_path, track, cover_url=specific_cover)

            status["status"] = "done"
            status["cover_url"] = specific_cover
            if progress_callback:
                progress_callback(status)
            return mp3_path
        except Exception as e:
            last_error = e
            if attempt < 2:
                time.sleep(1)

    status["status"] = "error"
    status["error"] = str(last_error)
    if progress_callback:
        progress_callback(status)
    raise last_error


def download_playlist(
    playlist_url: str,
    base_download_dir: str,
    progress_callback=None,
    max_workers: int = 5,
) -> tuple:
    """
    High-speed parallel pipeline with automatic retries:
    fetch playlist → download 5 tracks concurrently in parallel → tag with song-specific JPEG artwork → zip.
    """
    playlist_data = fetch_playlist(playlist_url)
    session_id = str(uuid.uuid4())[:8]
    safe_name = re.sub(r'[<>:"/\\|?*]', "_", playlist_data["name"])
    download_dir = os.path.join(base_download_dir, f"{safe_name}_{session_id}")
    os.makedirs(download_dir, exist_ok=True)

    tracks = playlist_data["tracks"]
    total = len(tracks)
    default_cover = playlist_data.get("cover_url")

    downloaded_files = []
    items = [(i, total, track) for i, track in enumerate(tracks)]

    # Parallel download with 5 concurrent threads
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_item = {
            executor.submit(_process_single_track, item, download_dir, default_cover, progress_callback): item
            for item in items
        }

        for future in as_completed(future_to_item):
            try:
                mp3_path = future.result()
                if mp3_path and os.path.exists(mp3_path):
                    downloaded_files.append(mp3_path)
            except Exception:
                pass

    # Create zip archive
    zip_filename = f"{safe_name}.zip"
    zip_path = os.path.join(base_download_dir, zip_filename)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fpath in downloaded_files:
            zf.write(fpath, os.path.basename(fpath))

    # Clean up temp folder
    shutil.rmtree(download_dir, ignore_errors=True)

    return zip_path, zip_filename, playlist_data
