import sys

# Ensure UTF-8 output on Windows
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
from downloader import fetch_playlist, download_playlist, extract_playlist_id

app = Flask(__name__)

DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Store active download sessions
download_sessions = {}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/whimsy")
def whimsy_ui():
    return render_template("whimsy.html")


@app.route("/wearable")
def wearable_ui():
    return render_template("wearable.html")


@app.route("/api/trending", methods=["GET"])
def get_trending():
    """Fetch today's top trending songs from Spotify Today's Top Hits playlist."""
    trending_url = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
    try:
        playlist_data = fetch_playlist(trending_url)
        frontend_tracks = []
        for t in playlist_data["tracks"]:
            frontend_tracks.append({
                "id": t["id"],
                "title": t["title"],
                "artist": t["artist"],
                "album": t["album"],
                "cover_url": t.get("cover_url", ""),
                "duration_ms": t["duration_ms"],
                "preview_url": t.get("preview_url", ""),
            })
        return jsonify({
            "name": playlist_data["name"],
            "owner": playlist_data["owner"],
            "cover_url": playlist_data.get("cover_url", ""),
            "total_tracks": len(frontend_tracks),
            "tracks": frontend_tracks,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
        for t in playlist_data["tracks"]:
            frontend_tracks.append({
                "id": t["id"],
                "title": t["title"],
                "artist": t["artist"],
                "album": t["album"],
                "cover_url": t["cover_url"],
                "duration_ms": t["duration_ms"],
            })

        return jsonify({
            "name": playlist_data["name"],
            "description": playlist_data["description"],
            "owner": playlist_data["owner"],
            "cover_url": playlist_data["cover_url"],
            "total_tracks": playlist_data["total_tracks"],
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
    print()
    print("  Spotiload - Spotify Playlist Downloader")
    print("  No API keys needed - just paste a link!")
    print()
    print("  Open: http://localhost:5000")
    print()
    app.run(debug=True, port=5000, threaded=True)
