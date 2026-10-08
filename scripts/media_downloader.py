#!/usr/bin/env python3
"""
ZenoDeck Universal Media Engine (YouTube 4K & All Social Media)
Powered by yt-dlp. Supports resolutions up to 4K (2160p60), 2K (1440p60), 1080p60,
and high-bitrate studio audio (320kbps MP3, 256kbps AAC, FLAC/WAV).
Supports YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, Twitch, Pinterest, etc.
"""

import sys
import json
import argparse
import os
import re
import glob

def format_duration(seconds):
    if not seconds or seconds < 0:
        return "0:00"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def is_youtube_id_or_url(val):
    if not val:
        return False
    val = val.strip()
    if re.match(r"^[0-9A-Za-z_-]{11}$", val):
        return True
    if re.search(r"(?:youtube\.com|youtu\.be)", val, re.I):
        return True
    return False

def extract_youtube_id(url_or_id):
    if not url_or_id:
        return None
    url_or_id = url_or_id.strip()
    match = re.search(r"(?:v=|\/embed\/|\/shorts\/|\/v\/|youtu\.be\/)([0-9A-Za-z_-]{11})(?:\?|&|:|$)", url_or_id)
    if match:
        return match.group(1)
    if re.match(r"^[0-9A-Za-z_-]{11}$", url_or_id):
        return url_or_id
    return None

def detect_platform_name(meta, input_url):
    extractor = (meta.get("extractor_key") or meta.get("extractor") or "").lower()
    if "youtube" in extractor or is_youtube_id_or_url(input_url):
        return "youtube"
    elif "tiktok" in extractor or "tiktok.com" in input_url:
        return "tiktok"
    elif "instagram" in extractor or "instagram.com" in input_url:
        return "instagram"
    elif "twitter" in extractor or "twitter.com" in input_url or "x.com" in input_url:
        return "twitter"
    elif "reddit" in extractor or "reddit.com" in input_url or "redd.it" in input_url:
        return "reddit"
    elif "facebook" in extractor or "fb.com" in input_url or "facebook.com" in input_url:
        return "facebook"
    elif "vimeo" in extractor or "vimeo.com" in input_url:
        return "vimeo"
    elif "twitch" in extractor or "twitch.tv" in input_url:
        return "twitch"
    elif "pinterest" in extractor or "pinterest.com" in input_url or "pin.it" in input_url:
        return "pinterest"
    return extractor or "social"

def get_base_ydl_opts():
    opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'socket_timeout': 30,
        'retries': 5,
        'fragment_retries': 5,
        'nocheckcertificate': True,
        'js_runtimes': {'node': {}},
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'web', 'tv_embedded']
            }
        }
    }
    return opts


def get_video_info(url):
    try:
        import yt_dlp
    except ImportError:
        return {
            "error": "yt-dlp is not installed. Run: pip install yt-dlp"
        }

    ydl_opts = get_base_ydl_opts()

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            meta = ydl.extract_info(url, download=False)
            if not meta:
                return {"error": "Failed to extract metadata"}

            # In case of playlist extraction where a single video was expected
            if "entries" in meta and meta.get("_type") == "playlist":
                entries = meta.get("entries") or []
                if entries:
                    meta = entries[0]
                else:
                    return {"error": "Empty playlist entry"}

            platform = detect_platform_name(meta, url)
            formats = meta.get("formats", [])
            qualities = []
            seen_badges = set()

            # Find best audio source URL first
            best_audio = None
            best_abr = 0
            for f in formats:
                acodec = f.get("acodec")
                if acodec and acodec != "none":
                    abr = f.get("abr") or 0
                    if abr > best_abr and f.get("url"):
                        best_abr = abr
                        best_audio = f

            best_audio_format = None
            if best_audio:
                best_audio_format = {
                    "itag": best_audio.get("format_id", 140),
                    "url": best_audio.get("url"),
                    "mimeType": best_audio.get("mime_type") or "audio/mp4",
                    "container": best_audio.get("ext") or "m4a",
                    "codec": best_audio.get("acodec") or "aac",
                    "bitrate": int((best_audio.get("abr") or 128) * 1000),
                    "contentLength": best_audio.get("filesize") or best_audio.get("filesize_approx") or 0,
                }

            # Process Video Formats (handles landscape and vertical portrait videos)
            # Sort by resolution descending
            sorted_formats = sorted(
                formats,
                key=lambda x: (
                    x.get("height") or 0,
                    x.get("tbr") or 0,
                    x.get("fps") or 0
                ),
                reverse=True
            )

            for f in sorted_formats:
                vcodec = f.get("vcodec", "none")
                if (not vcodec or vcodec == "none") or not f.get("url"):
                    continue

                width = f.get("width") or 0
                height = f.get("height") or 0
                fps = f.get("fps") or 30
                filesize = f.get("filesize") or f.get("filesize_approx") or 0

                # Determine effective resolution for both horizontal and vertical videos (e.g. TikTok 1080x1920)
                effective_res = height
                if width > 0 and height > 0 and width < height:
                    # Vertical video: width is the horizontal resolution standard (e.g. 1080 for 1080x1920)
                    effective_res = width

                badge = None
                label = ""
                is_4k = False
                is_60 = fps >= 50

                if effective_res >= 2160:
                    badge = "4K 60FPS" if is_60 else "4K"
                    label = f"Ultra HD 4K ({effective_res}p{fps if is_60 else ''})"
                    is_4k = True
                elif effective_res >= 1440:
                    badge = "2K 60FPS" if is_60 else "2K"
                    label = f"Quad HD 2K ({effective_res}p{fps if is_60 else ''})"
                elif effective_res >= 1080:
                    badge = "1080P 60" if is_60 else "1080P"
                    label = f"Full HD ({effective_res}p{fps if is_60 else ''})"
                elif effective_res >= 720:
                    badge = "720P"
                    label = f"High Definition ({effective_res}p)"
                elif effective_res >= 480 and "480P" not in seen_badges:
                    badge = "480P"
                    label = "Standard Definition (480p)"
                elif effective_res >= 360 and "360P" not in seen_badges:
                    badge = "360P"
                    label = "Standard Definition (360p)"
                elif "SD" not in seen_badges and effective_res > 0:
                    badge = "SD"
                    label = f"SD ({effective_res}p)"

                if badge and badge not in seen_badges:
                    seen_badges.add(badge)
                    ext = f.get("ext", "mp4")
                    # If this stream already has audio, it doesn't need separate audio
                    has_audio = f.get("acodec") and f.get("acodec") != "none"
                    v_format = {
                        "itag": f.get("format_id", 0),
                        "url": f.get("url"),
                        "mimeType": f.get("mime_type") or f"video/{ext}",
                        "container": ext,
                        "codec": vcodec,
                        "bitrate": int((f.get("tbr") or 1000) * 1000),
                        "contentLength": filesize,
                        "width": width,
                        "height": height,
                        "fps": int(fps),
                    }

                    # If stream already has audio, audioFormat is self, otherwise best_audio_format
                    associated_audio = None if has_audio else best_audio_format
                    total_bytes = filesize + (associated_audio.get("contentLength", 0) if associated_audio else 0)

                    qualities.append({
                        "id": badge.lower().replace(" ", "-"),
                        "itag": f.get("format_id", 0),
                        "label": label,
                        "resolutionLabel": f"{effective_res}p" if effective_res > 0 else (badge or "HD"),
                        "fps": int(fps),
                        "badge": badge,
                        "is4K": is_4k,
                        "is60fps": is_60,
                        "isAudioOnly": False,
                        "container": ext,
                        "approxSizeBytes": total_bytes,
                        "videoFormat": v_format,
                        "audioFormat": associated_audio,
                    })

            # If no categorized badges were matched (e.g. single direct mp4 from Twitter or Reddit)
            if not qualities and formats:
                best_fmt = sorted_formats[0] if sorted_formats else formats[0]
                if best_fmt.get("url"):
                    ext = best_fmt.get("ext", "mp4")
                    h = best_fmt.get("height") or 720
                    qualities.append({
                        "id": "best-direct",
                        "itag": best_fmt.get("format_id", 0),
                        "label": f"Best Quality ({h}p)",
                        "resolutionLabel": f"{h}p",
                        "fps": int(best_fmt.get("fps") or 30),
                        "badge": f"{h}P",
                        "is4K": h >= 2160,
                        "is60fps": (best_fmt.get("fps") or 30) >= 50,
                        "isAudioOnly": False,
                        "container": ext,
                        "approxSizeBytes": best_fmt.get("filesize") or best_fmt.get("filesize_approx") or 0,
                        "videoFormat": {
                            "itag": best_fmt.get("format_id", 0),
                            "url": best_fmt.get("url"),
                            "mimeType": best_fmt.get("mime_type") or f"video/{ext}",
                            "container": ext,
                            "codec": best_fmt.get("vcodec") or "h264",
                            "bitrate": int((best_fmt.get("tbr") or 1000) * 1000),
                            "contentLength": best_fmt.get("filesize") or 0,
                            "width": best_fmt.get("width") or 0,
                            "height": h,
                            "fps": int(best_fmt.get("fps") or 30),
                        },
                        "audioFormat": best_audio_format,
                    })

            # Process Audio Formats
            audio_source = best_audio_format
            if not audio_source and qualities and qualities[0].get("videoFormat"):
                # Use progressive video as audio source if no separate audio format exists
                v_f = qualities[0]["videoFormat"]
                audio_source = {
                    "itag": v_f["itag"],
                    "url": v_f["url"],
                    "mimeType": "audio/mp4",
                    "container": "m4a",
                    "codec": "aac",
                    "bitrate": 192000,
                    "contentLength": v_f["contentLength"],
                }

            duration = meta.get("duration", 0)

            audio_tiers = [
                ("audio-320", "Studio Master (320 kbps MP3)", "320 KBPS", 320, "mp3"),
                ("audio-256", "High Fidelity (256 kbps AAC)", "256 KBPS", 256, "m4a"),
                ("audio-192", "High Quality (192 kbps MP3)", "192 KBPS", 192, "mp3"),
                ("audio-128", "Standard Audio (128 kbps)", "128 KBPS", 128, "mp3"),
                ("audio-m4a", f"Native {platform.title()} Audio (M4A)", "NATIVE AAC", 160, "m4a"),
                ("audio-wav", "Lossless Studio Audio (WAV PCM)", "WAV PCM", 1411, "wav"),
            ]

            for key, label, badge, bitrate, ext in audio_tiers:
                approx_bytes = int((bitrate * 1000 / 8) * duration) if duration else (audio_source.get("contentLength", 0) if audio_source else 0)
                tier_audio_format = None
                if audio_source:
                    tier_audio_format = {
                        **audio_source,
                        "container": ext,
                    }
                qualities.append({
                    "id": key,
                    "itag": key,
                    "label": label,
                    "resolutionLabel": f"{bitrate} kbps",
                    "fps": 0,
                    "badge": badge,
                    "is4K": False,
                    "is60fps": False,
                    "isAudioOnly": True,
                    "audioBitrate": bitrate,
                    "container": ext,
                    "approxSizeBytes": approx_bytes,
                    "audioFormat": tier_audio_format,
                })

            vid_id = meta.get("id") or "media"
            thumb = meta.get("thumbnail")
            if not thumb:
                thumbs = meta.get("thumbnails") or []
                thumb = thumbs[-1].get("url") if thumbs else ""
            if not thumb and platform == "youtube":
                thumb = f"https://i.ytimg.com/vi/{vid_id}/maxresdefault.jpg"

            return {
                "videoId": vid_id,
                "platform": platform,
                "title": meta.get("title") or f"{platform.title()} Video",
                "author": meta.get("uploader") or meta.get("channel") or meta.get("creator") or f"{platform.title()} Creator",
                "authorUrl": meta.get("uploader_url") or "",
                "channelId": meta.get("channel_id", ""),
                "durationSeconds": duration,
                "durationFormatted": format_duration(duration),
                "thumbnailUrl": thumb,
                "viewCount": str(meta.get("view_count", "")),
                "webpageUrl": meta.get("webpage_url") or url,
                "qualities": qualities,
            }
    except Exception as e:
        return {"error": str(e)}

def download_video(url, quality="best", output_dir=".", output_format=None, json_result=False):
    try:
        import yt_dlp
    except ImportError:
        err = {"error": "yt-dlp is not installed. Run: pip install yt-dlp"}
        print(json.dumps(err))
        return 1

    os.makedirs(output_dir, exist_ok=True)

    format_selector = "bestvideo+bestaudio/best"
    is_audio = quality.startswith("audio")

    if quality in ["4k", "2160p", "4k-60fps"]:
        format_selector = "bestvideo[height<=2160]+bestaudio/best[height<=2160]/best"
    elif quality in ["2k", "1440p", "2k-60fps"]:
        format_selector = "bestvideo[height<=1440]+bestaudio/best[height<=1440]/best"
    elif quality in ["1080p", "1080p60", "1080p-60"]:
        format_selector = "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"
    elif quality in ["720p", "720"]:
        format_selector = "bestvideo[height<=720]+bestaudio/best[height<=720]/best"
    elif quality in ["480p", "480", "sd"]:
        format_selector = "bestvideo[height<=480]+bestaudio/best[height<=480]/best"
    elif is_audio:
        format_selector = "bestaudio/best"

    outtmpl = os.path.join(output_dir, "%(title).100s [%(id)s].%(ext)s")

    postprocessors = []
    if is_audio:
        audio_ext = output_format or "mp3"
        if quality in ["audio-320", "audio-192", "audio-128"]:
            audio_ext = "mp3"
        elif quality == "audio-256" or quality == "audio-m4a":
            audio_ext = "m4a"
        elif quality == "audio-wav":
            audio_ext = "wav"

        postprocessors.append({
            'key': 'FFmpegExtractAudio',
            'preferredcodec': audio_ext,
            'preferredquality': '320' if quality == 'audio-320' else '192',
        })

    ydl_opts = {
        'format': format_selector,
        'outtmpl': outtmpl,
        'merge_output_format': 'mp4' if not is_audio else None,
        'quiet': False if not json_result else True,
        'no_warnings': True,
        'socket_timeout': 45,
        'retries': 5,
        'fragment_retries': 5,
        'nocheckcertificate': True,
        'js_runtimes': {'node': {}},
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'web', 'tv_embedded']
            }
        }
    }


    if postprocessors:
        ydl_opts['postprocessors'] = postprocessors

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            meta = ydl.extract_info(url, download=True)
            if not meta:
                if json_result:
                    print(json.dumps({"error": "Failed to download media"}))
                return 1

            # Determine the generated file path
            filename = ydl.prepare_filename(meta)
            if is_audio and postprocessors:
                target_ext = postprocessors[0].get('preferredcodec', 'mp3')
                base, _ = os.path.splitext(filename)
                potential_file = f"{base}.{target_ext}"
                if os.path.exists(potential_file):
                    filename = potential_file

            if not os.path.exists(filename):
                # Search for matching files in directory
                vid_id = meta.get("id") or ""
                matches = glob.glob(os.path.join(output_dir, f"*{vid_id}*"))
                if matches:
                    filename = matches[0]

            filesize = os.path.getsize(filename) if os.path.exists(filename) else 0

            res = {
                "status": "success",
                "filename": os.path.basename(filename),
                "filepath": os.path.abspath(filename),
                "fileSizeBytes": filesize,
                "mimeType": "audio/" + os.path.splitext(filename)[1].lstrip(".") if is_audio else "video/mp4",
                "title": meta.get("title", ""),
                "id": meta.get("id", ""),
                "platform": detect_platform_name(meta, url),
            }

            if json_result:
                print(json.dumps(res, indent=2))
            return 0
    except Exception as e:
        err = {"error": str(e)}
        print(json.dumps(err))
        return 1

def get_playlist_info(url):
    try:
        import yt_dlp
    except ImportError:
        return {"error": "yt-dlp is not installed."}

    ydl_opts = get_base_ydl_opts()
    ydl_opts['extract_flat'] = 'in_playlist'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            meta = ydl.extract_info(url, download=False)
            if not meta:
                return {"error": "Failed to extract playlist metadata"}

            entries = meta.get("entries") or []
            items = []
            for idx, e in enumerate(entries, 1):
                if not e:
                    continue
                vid_id = e.get("id") or ""
                dur = e.get("duration") or 0
                thumbnails = e.get("thumbnails") or []
                thumb = thumbnails[-1].get("url") if thumbnails else (f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg" if is_youtube_id_or_url(url) else "")
                items.append({
                    "videoId": vid_id,
                    "title": e.get("title") or "Untitled Video",
                    "author": e.get("uploader") or meta.get("uploader") or "Content Creator",
                    "durationSeconds": dur,
                    "durationFormatted": format_duration(dur),
                    "thumbnailUrl": thumb,
                    "index": idx,
                })

            return {
                "playlistId": meta.get("id") or "playlist",
                "title": meta.get("title") or "Media Playlist",
                "author": meta.get("uploader") or "Content Creator",
                "videoCount": len(items),
                "thumbnailUrl": items[0]["thumbnailUrl"] if items else "",
                "items": items,
            }
    except Exception as e:
        return {"error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="ZenoDeck Universal Media Downloader Engine (yt-dlp)")
    parser.add_argument("url", help="Video or media URL (YouTube, TikTok, Instagram, Twitter/X, Reddit, etc.)")
    parser.add_argument("--info-json", action="store_true", help="Output video details and stream qualities in JSON")
    parser.add_argument("--playlist-json", action="store_true", help="Output playlist items in JSON")
    parser.add_argument("--download", action="store_true", help="Download the media directly using yt-dlp")
    parser.add_argument("--quality", default="best", help="Target quality (4k, 2k, 1080p, 720p, audio, audio-320, etc.)")
    parser.add_argument("--format", dest="out_format", default=None, help="Output format/container (mp4, mp3, m4a, wav)")
    parser.add_argument("--output-dir", default=".", help="Directory to save downloads")
    parser.add_argument("--json-result", action="store_true", help="Print result summary in JSON when download finishes")

    args = parser.parse_args()

    # Determine target URL
    raw_url = args.url.strip()
    if is_youtube_id_or_url(raw_url):
        vid = extract_youtube_id(raw_url)
        target_url = f"https://www.youtube.com/watch?v={vid}" if vid else raw_url
    else:
        target_url = raw_url

    if args.playlist_json:
        data = get_playlist_info(target_url)
        print(json.dumps(data, indent=2))
        return 0 if "error" not in data else 1

    if args.download:
        return download_video(
            target_url,
            quality=args.quality,
            output_dir=args.output_dir,
            output_format=args.out_format,
            json_result=args.json_result
        )

    # Info or default action
    data = get_video_info(target_url)
    print(json.dumps(data, indent=2))
    return 0 if "error" not in data else 1

if __name__ == "__main__":
    sys.exit(main() or 0)
