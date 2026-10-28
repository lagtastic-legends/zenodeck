"""
ytdlp_engine.py
Pure yt-dlp Python Module for ZenoDeck & ZenoTap (com.omnitool.app)
Integrated via Chaquopy for ultra-stable YouTube stream extraction and direct chunked downloads.
Zero external mobile FFmpeg binary required — hardware muxing is executed on-device by MediaMuxer.
"""

import os
import sys
import json
import time
import yt_dlp


def _format_duration(seconds):
    if not seconds:
        return "0:00"
    seconds = int(seconds)
    mins = seconds // 60
    secs = seconds % 60
    if mins < 60:
        return f"{mins}:{secs:02d}"
    hrs = mins // 60
    mins = mins % 60
    return f"{hrs}:{mins:02d}:{secs:02d}"


def extract_video_info(url: str) -> str:
    """
    Extracts video metadata and resolves a video-only format ladder with matching audio IDs.
    Returns a JSON string conforming to ZenoDeck's YouTubeVideoInfo schema.
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'noplaylist': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return json.dumps({'error': 'Failed to extract video information'})

            video_id = info.get('id', '')
            title = info.get('title', 'YouTube Video')
            duration = int(info.get('duration') or 0)
            uploader = info.get('uploader') or info.get('channel') or 'YouTube'
            thumbnail = info.get('thumbnail') or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
            formats = info.get('formats', [])

            # Identify best audio formats for container pairing
            # Best AAC/M4A audio format (itag 140 or m4a)
            best_m4a = None
            # Best Opus/WebM audio format (itag 251 or webm)
            best_opus = None

            audio_candidates = [
                f for f in formats
                if f.get('vcodec') == 'none' and f.get('acodec') != 'none'
            ]
            audio_candidates.sort(key=lambda x: (x.get('tbr') or x.get('abr') or 0), reverse=True)

            for af in audio_candidates:
                ext = (af.get('ext') or '').lower()
                acodec = (af.get('acodec') or '').lower()
                if not best_m4a and (ext in ['m4a', 'mp4'] or 'mp4a' in acodec or 'aac' in acodec):
                    best_m4a = af
                if not best_opus and (ext in ['webm', 'ogg'] or 'opus' in acodec):
                    best_opus = af

            fallback_audio = audio_candidates[0] if audio_candidates else None
            m4a_id = str(best_m4a.get('format_id')) if best_m4a else (str(fallback_audio.get('format_id')) if fallback_audio else '140')
            opus_id = str(best_opus.get('format_id')) if best_opus else (str(fallback_audio.get('format_id')) if fallback_audio else '251')

            # Pre-muxed fallback format (itag 18)
            fmt_18 = next((f for f in formats if str(f.get('format_id')) == '18' and f.get('url')), None)
            fallback_video_url = fmt_18.get('url') if fmt_18 else None

            # Filter for video formats only
            video_formats = [
                f for f in formats
                if f.get('vcodec') != 'none' and (f.get('height') or 0) > 0
            ]

            # Build targeted quality tiers
            qualities = []
            target_tiers = [
                ('2160p', 2000, 2160, '4K Ultra HD', '4K'),
                ('1440p', 1300, 1440, '2K Quad HD', '2K'),
                ('1080p', 950, 1080, 'Full HD', '1080P'),
                ('720p', 650, 720, 'High Definition 720p', '720P'),
                ('480p', 400, 480, 'Standard Definition 480p', '480P'),
                ('360p', 300, 360, 'Standard Definition 360p', '360P'),
            ]

            for tier_id, min_h, max_h, label_prefix, badge_prefix in target_tiers:
                candidates = [
                    f for f in video_formats
                    if min_h <= (f.get('height') or 0) <= max_h
                ]
                if not candidates:
                    continue

                # Prioritize 60fps first, then bitrate
                candidates.sort(key=lambda x: (x.get('fps') or 30, x.get('tbr') or x.get('vbr') or 0), reverse=True)
                top_cand = candidates[0]
                fps = top_cand.get('fps') or 30
                is_60 = fps >= 50
                is_4k = (top_cand.get('height') or 0) >= 2000

                v_ext = (top_cand.get('ext') or '').lower()
                v_codec = (top_cand.get('vcodec') or '').lower()
                is_webm = v_ext == 'webm' or 'vp9' in v_codec or 'vp09' in v_codec or 'av01' in v_codec
                container = 'webm' if is_webm else 'mp4'

                paired_audio_id = opus_id if is_webm else m4a_id
                paired_audio_fmt = best_opus if is_webm else best_m4a

                v_size = top_cand.get('filesize') or top_cand.get('filesize_approx') or 0
                a_size = (paired_audio_fmt.get('filesize') or paired_audio_fmt.get('filesize_approx') or 0) if paired_audio_fmt else 0
                approx_size = v_size + a_size

                badge = f"{badge_prefix} 60FPS" if (is_60 and badge_prefix in ['4K', '2K']) else f"{badge_prefix} 60" if is_60 else badge_prefix
                full_label = f"{label_prefix} 60fps" if is_60 else label_prefix
                id_str = f"{top_cand.get('height')}p60" if is_60 else f"{top_cand.get('height')}p"

                qualities.append({
                    'id': id_str,
                    'label': full_label,
                    'resolutionLabel': f"{top_cand.get('width', 0)} × {top_cand.get('height', 0)} ({id_str})",
                    'fps': fps,
                    'badge': badge,
                    'is4K': is_4k,
                    'is60fps': is_60,
                    'isAudioOnly': False,
                    'container': container,
                    'approxSizeBytes': approx_size,
                    'fallbackVideoUrl': fallback_video_url,
                    'ytdlpVideoFormatId': str(top_cand.get('format_id')),
                    'ytdlpAudioFormatId': paired_audio_id,
                    'videoFormat': {
                        'itag': int(top_cand.get('format_id')) if str(top_cand.get('format_id')).isdigit() else 0,
                        'url': top_cand.get('url', ''),
                        'mimeType': f"video/{container}; codecs=\"{top_cand.get('vcodec', '')}\"",
                        'container': container,
                        'codec': top_cand.get('vcodec', ''),
                        'bitrate': int(top_cand.get('tbr') or top_cand.get('vbr') or 0) * 1000,
                        'contentLength': v_size,
                        'width': top_cand.get('width'),
                        'height': top_cand.get('height'),
                        'fps': fps,
                    },
                    'audioFormat': {
                        'itag': int(paired_audio_fmt.get('format_id')) if paired_audio_fmt and str(paired_audio_fmt.get('format_id')).isdigit() else 0,
                        'url': paired_audio_fmt.get('url', '') if paired_audio_fmt else '',
                        'mimeType': f"audio/{'webm' if is_webm else 'mp4'}; codecs=\"{paired_audio_fmt.get('acodec', '') if paired_audio_fmt else ''}\"",
                        'container': 'webm' if is_webm else 'm4a',
                        'codec': paired_audio_fmt.get('acodec', '') if paired_audio_fmt else '',
                        'bitrate': int(paired_audio_fmt.get('abr') or paired_audio_fmt.get('tbr') or 128) * 1000 if paired_audio_fmt else 128000,
                        'contentLength': a_size,
                    } if paired_audio_fmt else None
                })

            result = {
                'videoId': video_id,
                'title': title,
                'durationSeconds': duration,
                'durationFormatted': _format_duration(duration),
                'thumbnailUrl': thumbnail,
                'author': uploader,
                'qualities': qualities,
                'fallbackVideoUrl': fallback_video_url,
            }
            return json.dumps(result)
    except Exception as e:
        return json.dumps({'error': str(e)})


def download_video_with_ytdlp(url: str, v_format_id: str, a_format_id: str, out_dir: str, progress_cb=None) -> str:
    """
    Downloads the selected video format and optional separate audio format to out_dir using yt-dlp.
    Returns a JSON string containing paths to the downloaded video and audio files.
    """
    os.makedirs(out_dir, exist_ok=True)

    def make_hook(phase_name):
        def hook(d):
            if progress_cb is None:
                return
            if d.get('status') == 'downloading':
                try:
                    downloaded = d.get('downloaded_bytes') or 0
                    total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                    speed = float(d.get('speed') or 0.0)
                    progress_cb.onProgress(int(downloaded), int(total), speed, phase_name)
                except Exception:
                    pass
        return hook

    # Case 1: Pre-muxed format (e.g. format 18) or no separate audio requested
    if not a_format_id or a_format_id == 'none' or v_format_id == '18':
        out_tmpl = os.path.join(out_dir, 'yt_merged.%(ext)s')
        ydl_opts = {
            'format': v_format_id if v_format_id else 'best[ext=mp4]/best',
            'outtmpl': out_tmpl,
            'progress_hooks': [make_hook('downloading_video')],
            'http_chunk_size': 4194304,
            'retries': 5,
            'fragment_retries': 5,
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Find the written file
        for f in os.listdir(out_dir):
            if f.startswith('yt_merged.'):
                full_path = os.path.join(out_dir, f)
                ext = f.split('.')[-1]
                return json.dumps({
                    'success': True,
                    'video_path': full_path,
                    'audio_path': None,
                    'is_merged': True,
                    'ext': ext
                })
        return json.dumps({'success': False, 'error': 'Merged file not found after download'})

    # Case 2: Adaptive dual-stream download (Video track then Audio track)
    # 1. Download Video
    v_out_tmpl = os.path.join(out_dir, 'yt_video.%(ext)s')
    ydl_opts_v = {
        'format': v_format_id,
        'outtmpl': v_out_tmpl,
        'progress_hooks': [make_hook('downloading_video')],
        'http_chunk_size': 4194304,
        'retries': 5,
        'fragment_retries': 5,
        'quiet': True,
        'no_warnings': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts_v) as ydl_v:
        ydl_v.download([url])

    video_file = None
    v_ext = 'mp4'
    for f in os.listdir(out_dir):
        if f.startswith('yt_video.'):
            video_file = os.path.join(out_dir, f)
            v_ext = f.split('.')[-1]
            break

    if not video_file or not os.path.exists(video_file):
        return json.dumps({'success': False, 'error': 'Video stream download failed'})

    # 2. Download Audio
    a_out_tmpl = os.path.join(out_dir, 'yt_audio.%(ext)s')
    ydl_opts_a = {
        'format': a_format_id,
        'outtmpl': a_out_tmpl,
        'progress_hooks': [make_hook('downloading_audio')],
        'http_chunk_size': 4194304,
        'retries': 5,
        'fragment_retries': 5,
        'quiet': True,
        'no_warnings': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts_a) as ydl_a:
        ydl_a.download([url])

    audio_file = None
    for f in os.listdir(out_dir):
        if f.startswith('yt_audio.'):
            audio_file = os.path.join(out_dir, f)
            break

    if not audio_file or not os.path.exists(audio_file):
        return json.dumps({'success': False, 'error': 'Audio stream download failed'})

    return json.dumps({
        'success': True,
        'video_path': video_file,
        'audio_path': audio_file,
        'is_merged': False,
        'ext': v_ext
    })
