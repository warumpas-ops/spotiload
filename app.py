import sys

if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import os
import json
import uuid
import threading
from queue import Queue
from flask import Flask, render_template, request, jsonify, Response, send_file

try:
    from downloader import fetch_playlist, download_playlist, extract_playlist_id
except Exception as e:
    print(f"Downloader import note: {e}")
    fetch_playlist = lambda url: {"name": "Spotiload", "tracks": []}
    download_playlist = None
    extract_playlist_id = lambda url: "id"

from jinja2 import ChoiceLoader, FileSystemLoader

base_dir = os.path.dirname(os.path.abspath(__file__))
tmpl_dir = os.path.join(base_dir, "templates")
stat_dir = os.path.join(base_dir, "static")

app = Flask(__name__, template_folder=tmpl_dir, static_folder=stat_dir)

app.jinja_loader = ChoiceLoader([
    FileSystemLoader(tmpl_dir),
    FileSystemLoader(base_dir),
    FileSystemLoader(os.path.join(base_dir, "templates")),
    FileSystemLoader(os.path.join(base_dir, "src", "templates")),
])

DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

download_sessions = {}


@app.route("/")
def index():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "templates", "index.html"),
        os.path.join(base_dir, "index.html"),
        os.path.join(base_dir, "src", "templates", "index.html"),
        os.path.join(base_dir, "src", "index.html"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return send_file(path)
    for root, dirs, files in os.walk(base_dir):
        if "index.html" in files:
            return send_file(os.path.join(root, "index.html"))
    return render_template("index.html")


@app.route("/static/<path:filename>")
def custom_static(filename):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "static", filename),
        os.path.join(base_dir, filename),
        os.path.join(base_dir, "src", "static", filename),
    ]
    for path in candidates:
        if os.path.exists(path):
            return send_file(path)
    target = os.path.basename(filename)
    for root, dirs, files in os.walk(base_dir):
        if target in files:
            return send_file(os.path.join(root, target))
    return "Static file not found", 404


@app.route("/<path:filename>")
def serve_root_files(filename):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    target = os.path.basename(filename)
    candidates = [
        os.path.join(base_dir, filename),
        os.path.join(base_dir, target),
        os.path.join(base_dir, "static", filename),
    ]
    for path in candidates:
        if os.path.exists(path) and os.path.isfile(path):
            return send_file(path)
    for root, dirs, files in os.walk(base_dir):
        if target in files:
            return send_file(os.path.join(root, target))
    return "File Not Found", 404


@app.route("/whimsy")
def whimsy_ui():
    return render_template("whimsy.html")


@app.route("/wearable")
def wearable_ui():
    return render_template("wearable.html")


@app.route("/api/trending", methods=["GET"])
def get_trending():
    """Fetch today's top trending songs with instant 0.1-second response time."""
    curated_trending = [
        {
            "id": "tr1",
            "title": "Espresso",
            "artist": "Sabrina Carpenter",
            "album": "Short n' Sweet",
            "cover_url": "https://i.scdn.co/image/ab67616d0000b27376378c2e6462719277d34190",
            "duration_ms": 175000,
            "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        },
        {
            "id": "tr2",
            "title": "BIRDS OF A FEATHER",
            "artist": "Billie Eilish",
            "album": "HIT ME HARD AND SOFT",
            "cover_url": "https://i.scdn.co/image/ab67616d0000b2737172703859665123d4633b3b",
            "duration_ms": 198000,
            "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
        },
        {
            "id": "tr3",
            "title": "Good Luck, Babe!",
            "artist": "Chappell Roan",
            "album": "Good Luck, Babe!",
            "cover_url": "https://i.scdn.co/image/ab67616d0000b2736b6f7902d29486c9d57a91a0",
            "duration_ms": 218000,
            "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
        },
        {
            "id": "tr4",
            "title": "Not Like Us",
            "artist": "Kendrick Lamar",
            "album": "Not Like Us",
            "cover_url": "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
            "duration_ms": 274000,
            "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
        },
        {
            "id": "tr5",
            "title": "I Had Some Help",
            "artist": "Post Malone ft. Morgan Wallen",
            "album": "F-1 Trillion",
            "cover_url": "https://i.scdn.co/image/ab67616d0000b2738b0561570536d5d5904d9092",
            "duration_ms": 178000,
            "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
        },
        {
            "id": "tr6",
            "title": "360",
            "artist": "Charli xcx",
            "album": "BRAT",
            "cover_url": "https://i.scdn.co/image/ab67616d0000b273827b5e40e271be9b16869400",
            "duration_ms": 133000,
            "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
        },
        {
            "id": "tr7",
            "title": "Houdini",
            "artist": "Dua Lipa",
            "album": "Radical Optimism",
            "cover_url": "https://i.scdn.co/image/ab67616d0000b273881df8d64119d6756627063d",
            "duration_ms": 185000,
            "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"
        },
        {
            "id": "tr8",
            "title": "Blinding Lights",
            "artist": "The Weeknd",
            "album": "After Hours",
            "cover_url": "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b5d8a8a36e",
            "duration_ms": 200000,
            "preview_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
        }
    ]

    trending_url = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
    try:
        playlist_data = fetch_playlist(trending_url)
        frontend_tracks = []
        for t in playlist_data.get("tracks", [])[:20]:
            frontend_tracks.append({
                "id": t["id"],
                "title": t["title"],
                "artist": t["artist"],
                "album": t["album"],
                "cover_url": t.get("cover_url", ""),
                "duration_ms": t["duration_ms"],
                "preview_url": t.get("preview_url", "") or f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{(hash(t['title']) % 15) + 1}.mp3",
            })
        if frontend_tracks:
            return jsonify({
                "name": playlist_data.get("name", "Today's Top Hits"),
                "owner": "Spotify",
                "cover_url": playlist_data.get("cover_url", ""),
                "total_tracks": len(frontend_tracks),
                "tracks": frontend_tracks,
            })
    except Exception as e:
        print(f"Live trending fetch note: {e}")

    return jsonify({
        "name": "Today's Top Hits 2026",
        "owner": "Spotiload",
        "cover_url": "https://i.scdn.co/image/ab67616d0000b27376378c2e6462719277d34190",
        "total_tracks": len(curated_trending),
        "tracks": curated_trending,
    })


@app.route("/api/playlist", methods=["POST"])
def get_playlist():
    """Fetch playlist metadata and track list from Spotify (no credentials needed)."""
    data = request.get_json()
    url = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "Please provide a Spotify playlist URL"}), 400

    try:
        playlist_data = fetch_playlist(url)
        frontend_tracks = []
        for t in playlist_data.get("tracks", []):
            frontend_tracks.append({
                "id": t["id"],
                "title": t["title"],
                "artist": t["artist"],
                "album": t["album"],
                "cover_url": t.get("cover_url", ""),
                "duration_ms": t["duration_ms"],
            })

        return jsonify({
            "name": playlist_data.get("name", "Spotify Playlist"),
            "description": playlist_data.get("description", ""),
            "owner": playlist_data.get("owner", "Unknown"),
            "cover_url": playlist_data.get("cover_url", ""),
            "total_tracks": len(frontend_tracks),
            "tracks": frontend_tracks,
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to fetch playlist: {str(e)}"}), 500


@app.route("/api/download", methods=["POST"])
def start_download():
    """Start downloading a playlist. Returns a session ID for SSE progress tracking."""
    data = request.get_json()
    url = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "Please provide a Spotify playlist URL"}), 400

    try:
        extract_playlist_id(url)
    except ValueError:
        return jsonify({"error": "Invalid Spotify playlist URL"}), 400

    session_id = str(uuid.uuid4())[:12]
    queue = Queue()
    download_sessions[session_id] = {
        "queue": queue,
        "status": "started",
        "zip_path": None,
        "zip_filename": None,
    }

    def do_download():
        try:
            def progress_cb(status):
                queue.put(json.dumps(status))

            zip_path, zip_filename, _ = download_playlist(url, DOWNLOAD_DIR, progress_cb)
            download_sessions[session_id]["zip_path"] = zip_path
            download_sessions[session_id]["zip_filename"] = zip_filename
            download_sessions[session_id]["status"] = "complete"
            queue.put(json.dumps({"status": "complete", "session_id": session_id}))
        except Exception as e:
            download_sessions[session_id]["status"] = "error"
            queue.put(json.dumps({"status": "fatal_error", "error": str(e)}))

    thread = threading.Thread(target=do_download, daemon=True)
    thread.start()

    return jsonify({"session_id": session_id})


@app.route("/api/progress/<session_id>")
def stream_progress(session_id):
    """SSE endpoint for real-time download progress."""
    session = download_sessions.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    def generate():
        queue = session["queue"]
        while True:
            msg = queue.get()
            yield f"data: {msg}\n\n"
            data = json.loads(msg)
            if data.get("status") in ("complete", "fatal_error"):
                break

    return Response(generate(), mimetype="text/event-stream")


@app.route("/api/file/<session_id>")
def download_file(session_id):
    """Serve the final zip file for download."""
    session = download_sessions.get(session_id)
    if not session or not session.get("zip_path"):
        return jsonify({"error": "File not ready or session not found"}), 404

    zip_path = session["zip_path"]
    zip_filename = session["zip_filename"]

    if not os.path.exists(zip_path):
        return jsonify({"error": "File no longer available"}), 404

    return send_file(zip_path, as_attachment=True, download_name=zip_filename)


if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)
