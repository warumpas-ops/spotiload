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
try:
    import static_ffmpeg
    static_ffmpeg.add_paths()
except Exception as e:
    print(f"static_ffmpeg note: {e}")

from queue import Queue
from flask import Flask, render_template, request, jsonify, Response, send_file
from downloader import (
    fetch_playlist,
    download_playlist,
    extract_playlist_id,
    fetch_spotify_data,
    download_single_track,
    extract_spotify_id,
)



from jinja2 import ChoiceLoader, FileSystemLoader

base_dir = os.path.dirname(os.path.abspath(__file__))
tmpl_dir = os.path.join(base_dir, "templates")
stat_dir = os.path.join(base_dir, "static")

app = Flask(__name__, template_folder=tmpl_dir, static_folder=None)

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
    candidates = [
        os.path.join(base_dir, "templates", "index.html"),
        os.path.join(base_dir, "index.html"),
        os.path.join(base_dir, "src", "templates", "index.html"),
        os.path.join(base_dir, "src", "index.html"),
    ]
    for path in candidates:
        if os.path.exists(path) and os.path.isfile(path):
            return send_file(path)
    for root, dirs, files in os.walk(base_dir):
        if "index.html" in files:
            return send_file(os.path.join(root, "index.html"))
    return render_template("index.html")


@app.route("/static/<path:filename>")
def custom_static(filename):
    target = os.path.basename(filename)
    candidates = [
        os.path.join(base_dir, target),
        os.path.join(base_dir, filename),
        os.path.join(base_dir, "static", filename),
        os.path.join(base_dir, "static", "js", target),
        os.path.join(base_dir, "static", "css", target),
        os.path.join(base_dir, "static", "images", target),
    ]
    for path in candidates:
        if os.path.exists(path) and os.path.isfile(path):
            return send_file(path)
    for root, dirs, files in os.walk(base_dir):
        if target in files:
            return send_file(os.path.join(root, target))
    return "Static file not found", 404


@app.route("/<path:filename>")
def serve_root_files(filename):
    target = os.path.basename(filename)
    candidates = [
        os.path.join(base_dir, target),
        os.path.join(base_dir, filename),
        os.path.join(base_dir, "static", filename),
    ]
    for path in candidates:
        if os.path.exists(path) and os.path.isfile(path):
            return send_file(path)
    for root, dirs, files in os.walk(base_dir):
        if target in files:
            return send_file(os.path.join(root, target))
    return "File Not Found", 404


@app.route("/api/trending", methods=["GET"])
def get_trending():
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
        }
    ]
    return jsonify({
        "name": "Today's Top Hits 2026",
        "owner": "Spotiload",
        "cover_url": "https://i.scdn.co/image/ab67616d0000b27376378c2e6462719277d34190",
        "total_tracks": len(curated_trending),
        "tracks": curated_trending,
    })


@app.route("/api/playlist", methods=["POST"])
def get_playlist():
    data = request.get_json()
    url = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "Please provide a Spotify playlist or song link"}), 400

    try:
        playlist_data = fetch_spotify_data(url)
        frontend_tracks = []
        for t in playlist_data.get("tracks", []):
            frontend_tracks.append({
                "id": t["id"],
                "title": t["title"],
                "artist": t["artist"],
                "album": t["album"],
                "cover_url": t.get("cover_url", ""),
                "duration_ms": t["duration_ms"],
                "release_date": t.get("release_date", ""),
                "track_number": t.get("track_number", 1),
            })

        return jsonify({
            "type": playlist_data.get("type", "playlist"),
            "name": playlist_data.get("name", "Spotify Music"),
            "description": playlist_data.get("description", ""),
            "owner": playlist_data.get("owner", "Unknown"),
            "cover_url": playlist_data.get("cover_url", ""),
            "total_tracks": len(frontend_tracks),
            "tracks": frontend_tracks,
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to fetch music: {str(e)}"}), 500


@app.route("/api/download-single", methods=["POST"])
def download_single():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No track information provided"}), 400

    track = data.get("track") or data
    if not track.get("title"):
        return jsonify({"error": "Track title is required"}), 400

    try:
        session_id = str(uuid.uuid4())[:8]
        single_dir = os.path.join(DOWNLOAD_DIR, f"single_{session_id}")
        mp3_path = download_single_track(track, single_dir)
        filename = os.path.basename(mp3_path)
        return send_file(
            mp3_path,
            as_attachment=True,
            download_name=filename,
            mimetype="audio/mpeg"
        )
    except Exception as e:
        return jsonify({"error": f"Single song download failed: {str(e)}"}), 500


@app.route("/api/download", methods=["POST"])
def start_download():
    data = request.get_json()
    url = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "Please provide a Spotify URL"}), 400

    try:
        extract_spotify_id(url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

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

            zip_path, zip_filename, _ = download_playlist(url, DOWNLOAD_DIR, progress_cb, max_workers=2)
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
