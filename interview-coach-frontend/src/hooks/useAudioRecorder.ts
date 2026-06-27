"use client";

import { useRef, useState, useCallback } from "react";

interface Options {
  onChunk: (buffer: ArrayBuffer) => void;
  chunkIntervalMs?: number;
}

export function useAudioRecorder({ onChunk, chunkIntervalMs = 3000 }: Options) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string>("");

  const start = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      streamRef.current = stream;

      // Pick a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          const buffer = await e.data.arrayBuffer();
          onChunk(buffer);
        }
      };

      recorder.onerror = (e) => {
        setError("Recording error occurred");
        console.error("MediaRecorder error:", e);
      };

      recorder.start(chunkIntervalMs);
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("Microphone permission denied. Please allow microphone access.");
      } else {
        setError("Could not access microphone.");
      }
      console.error("getUserMedia error:", err);
    }
  }, [onChunk, chunkIntervalMs]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    streamRef.current = null;
    setRecording(false);
  }, []);

  return { recording, start, stop, error };
}
