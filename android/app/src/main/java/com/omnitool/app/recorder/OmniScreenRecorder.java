package com.omnitool.app.recorder;

import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.MediaCodec;
import android.media.MediaCodecInfo;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.media.projection.MediaProjection;
import android.os.Build;
import android.util.Log;
import android.view.Surface;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.concurrent.atomic.AtomicBoolean;

public class OmniScreenRecorder {
    private static final String TAG = "OmniScreenRecorder";
    private final MediaProjection mediaProjection;
    private final int width;
    private final int height;
    private final int dpi;
    private final String outputPath;
    private final int videoBitrate;
    private final int fps;
    private final boolean recordInternalAudio;
    private final boolean recordMic;

    private MediaMuxer muxer;
    private MediaCodec videoEncoder;
    private MediaCodec audioEncoder;
    private VirtualDisplay virtualDisplay;
    private AudioRecord audioRecord;

    private int videoTrackIndex = -1;
    private int audioTrackIndex = -1;
    private boolean muxerStarted = false;

    private Thread videoThread;
    private Thread audioThread;
    private final AtomicBoolean isRecording = new AtomicBoolean(false);

    public interface Listener {
        void onComplete(String path);
        void onError(String error);
    }
    private Listener listener;

    public OmniScreenRecorder(MediaProjection mp, int w, int h, int dpi, int bitrate, int fps, boolean internalAudio, boolean mic, String path, Listener l) {
        this.mediaProjection = mp;
        this.width = w;
        this.height = h;
        this.dpi = dpi;
        this.videoBitrate = bitrate;
        this.fps = fps;
        this.recordInternalAudio = internalAudio;
        this.recordMic = mic;
        this.outputPath = path;
        this.listener = l;
    }

        private MediaProjection.Callback projectionCallback = new MediaProjection.Callback() {
        @Override
        public void onStop() {
            super.onStop();
            // Stopped via System UI
            stop();
        }
    };

    public void start() {
        if (mediaProjection != null) {
            mediaProjection.registerCallback(projectionCallback, null);
        }
        try {
            muxer = new MediaMuxer(outputPath, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            prepareVideoEncoder();
            if (recordInternalAudio || recordMic) {
                prepareAudioEncoder();
            }

            isRecording.set(true);

            videoThread = new Thread(this::videoLoop);
            videoThread.start();

            if (audioEncoder != null) {
                audioThread = new Thread(this::audioLoop);
                audioThread.start();
            }

        } catch (Exception e) {
            if (listener != null) listener.onError(e.getMessage());
        }
    }

    public void stop() {
        if (!isRecording.get()) return;
        isRecording.set(false);
        try {
            if (videoThread != null) videoThread.join(2000);
            if (audioThread != null) audioThread.join(2000);
        } catch (InterruptedException ignored) {}
        
        release();
        if (listener != null) listener.onComplete(outputPath);
    }

    private void prepareVideoEncoder() throws IOException {
        int encWidth = (width / 2) * 2;
        int encHeight = (height / 2) * 2;
        MediaFormat format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, encWidth, encHeight);
        format.setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface);
        format.setInteger(MediaFormat.KEY_BIT_RATE, videoBitrate);
        format.setInteger(MediaFormat.KEY_FRAME_RATE, fps);
        format.setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1);

        videoEncoder = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC);
        videoEncoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
        Surface surface = videoEncoder.createInputSurface();
        videoEncoder.start();

        virtualDisplay = mediaProjection.createVirtualDisplay("OmniScreen",
                encWidth, encHeight, dpi, DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                surface, null, null);
    }

    private void prepareAudioEncoder() throws IOException {
        int sampleRate = 44100;
        int channelConfig = AudioFormat.CHANNEL_IN_MONO;
        int audioFormat = AudioFormat.ENCODING_PCM_16BIT;
        int minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat);
        if (minBufferSize <= 0) minBufferSize = 4096;

        try {
            if (recordInternalAudio && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                AudioPlaybackCaptureConfiguration config = new AudioPlaybackCaptureConfiguration.Builder(mediaProjection)
                        .addMatchingUsage(android.media.AudioAttributes.USAGE_MEDIA)
                        .addMatchingUsage(android.media.AudioAttributes.USAGE_GAME)
                        .addMatchingUsage(android.media.AudioAttributes.USAGE_UNKNOWN)
                        .build();
                audioRecord = new AudioRecord.Builder()
                        .setAudioPlaybackCaptureConfig(config)
                        .setAudioFormat(new AudioFormat.Builder()
                                .setEncoding(audioFormat)
                                .setSampleRate(sampleRate)
                                .setChannelMask(channelConfig)
                                .build())
                        .setBufferSizeInBytes(minBufferSize * 2)
                        .build();
            } else {
                audioRecord = new AudioRecord(android.media.MediaRecorder.AudioSource.MIC, sampleRate, channelConfig, audioFormat, minBufferSize * 2);
            }
        } catch (SecurityException se) {
            Log.e(TAG, "RECORD_AUDIO permission missing; skipping audio capture: " + se.getMessage());
            audioRecord = null;
            return;
        }

        if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
            Log.e(TAG, "AudioRecord failed to initialize; continuing video-only recording.");
            try { audioRecord.release(); } catch (Exception ignored) {}
            audioRecord = null;
            return;
        }

        MediaFormat format = MediaFormat.createAudioFormat(MediaFormat.MIMETYPE_AUDIO_AAC, sampleRate, 1);
        format.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
        format.setInteger(MediaFormat.KEY_BIT_RATE, 128000);
        
        audioEncoder = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_AUDIO_AAC);
        audioEncoder.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
        audioEncoder.start();
        try {
            audioRecord.startRecording();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start audioRecord: " + e.getMessage());
        }
    }

    private synchronized boolean checkMuxerStart() {
        if (muxerStarted) return true;
        if (videoTrackIndex >= 0 && (audioEncoder == null || audioTrackIndex >= 0)) {
            try {
                muxer.start();
                muxerStarted = true;
                return true;
            } catch (Exception e) {
                Log.e(TAG, "Failed to start muxer: " + e.getMessage());
            }
        }
        return false;
    }

    private void videoLoop() {
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        long startTime = System.nanoTime();
        while (isRecording.get() || videoEncoder != null) {
            if (videoEncoder == null) break;
            int outIndex = videoEncoder.dequeueOutputBuffer(info, 10000);
            if (outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                synchronized(this) {
                    videoTrackIndex = muxer.addTrack(videoEncoder.getOutputFormat());
                    checkMuxerStart();
                }
            } else if (outIndex >= 0) {
                if ((info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) {
                    info.size = 0;
                }
                if (info.size != 0 && muxerStarted) {
                    ByteBuffer outBuf = videoEncoder.getOutputBuffer(outIndex);
                    if (outBuf != null) {
                        info.presentationTimeUs = (System.nanoTime() - startTime) / 1000;
                        synchronized(this) {
                            if (muxerStarted) {
                                muxer.writeSampleData(videoTrackIndex, outBuf, info);
                            }
                        }
                    }
                }
                videoEncoder.releaseOutputBuffer(outIndex, false);
                if (!isRecording.get()) {
                    try { videoEncoder.signalEndOfInputStream(); } catch (Exception ignored){}
                    break;
                }
            }
        }
    }

    private void audioLoop() {
        byte[] buf = new byte[2048];
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        long startTime = System.nanoTime();

        // Feed initial silent PCM buffer so audio encoder emits format change immediately
        try {
            int initIndex = audioEncoder.dequeueInputBuffer(10000);
            if (initIndex >= 0) {
                ByteBuffer inBuf = audioEncoder.getInputBuffer(initIndex);
                if (inBuf != null) {
                    inBuf.clear();
                    inBuf.put(new byte[1024]);
                    audioEncoder.queueInputBuffer(initIndex, 0, 1024, 0, 0);
                }
            }
        } catch (Exception ignored) {}

        while (isRecording.get()) {
            if (audioRecord != null) {
                int read = audioRecord.read(buf, 0, buf.length);
                if (read > 0) {
                    int inIndex = audioEncoder.dequeueInputBuffer(10000);
                    if (inIndex >= 0) {
                        ByteBuffer inBuf = audioEncoder.getInputBuffer(inIndex);
                        if (inBuf != null) {
                            inBuf.clear();
                            inBuf.put(buf, 0, read);
                            long pts = (System.nanoTime() - startTime) / 1000;
                            audioEncoder.queueInputBuffer(inIndex, 0, read, pts, 0);
                        }
                    }
                } else if (read <= 0) {
                    try { Thread.sleep(10); } catch (InterruptedException ignored) {}
                }
            }
            
            int outIndex = audioEncoder.dequeueOutputBuffer(info, 10000);
            if (outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                synchronized(this) {
                    audioTrackIndex = muxer.addTrack(audioEncoder.getOutputFormat());
                    checkMuxerStart();
                }
            } else if (outIndex >= 0) {
                if ((info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) != 0) {
                    info.size = 0;
                }
                if (info.size != 0 && muxerStarted) {
                    ByteBuffer outBuf = audioEncoder.getOutputBuffer(outIndex);
                    if (outBuf != null) {
                        info.presentationTimeUs = (System.nanoTime() - startTime) / 1000;
                        synchronized(this) {
                            if (muxerStarted) {
                                muxer.writeSampleData(audioTrackIndex, outBuf, info);
                            }
                        }
                    }
                }
                audioEncoder.releaseOutputBuffer(outIndex, false);
            }
        }
    }

    private void release() {
        if (virtualDisplay != null) { virtualDisplay.release(); virtualDisplay = null; }
        if (audioRecord != null) { audioRecord.stop(); audioRecord.release(); audioRecord = null; }
        if (videoEncoder != null) { videoEncoder.stop(); videoEncoder.release(); videoEncoder = null; }
        if (audioEncoder != null) { audioEncoder.stop(); audioEncoder.release(); audioEncoder = null; }
        if (muxer != null) { 
            if (muxerStarted) {
                try { muxer.stop(); } catch(Exception ignored){}
            }
            muxer.release(); muxer = null; muxerStarted = false; 
        }
        mediaProjection.stop();
    }
}

