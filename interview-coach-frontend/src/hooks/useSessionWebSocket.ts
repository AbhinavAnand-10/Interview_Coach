"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface TranscriptChunk {
  chunkIndex: number;
  text: string;
  startTime: number;
}

export interface SessionFeedback {
  filler_words: Record<string, number>;
  filler_word_count: number;
  estimated_wpm: number;
  clarity_score: number;
  confidence_score: number;
  structure_score: number;
  overall_score: number;
  strengths: string[];
  improvements: string[];
  summary: string;
  error?: string;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function useSessionWebSocket(sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  const connect = useCallback(() => {
    if (!sessionId) return;

    const wsUrl = `ws://localhost:8000/ws/session/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    setStatus("connecting");

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setStatus("connected");
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setStatus("disconnected");
    };

    ws.onerror = (e) => {
      console.error("WebSocket error:", e);
      setStatus("error");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);

        switch (msg.type) {
          case "session_start":
            console.log("Session started:", msg.session_id);
            break;

          case "transcript":
            setTranscriptChunks((prev) => [
              ...prev,
              {
                chunkIndex: msg.chunk_index,
                text: msg.text,
                startTime: msg.start_time,
              },
            ]);
            break;

          case "feedback":
            setFeedback(msg as SessionFeedback);
            break;

          case "session_complete":
            setFeedback(msg.feedback);
            setSessionComplete(true);
            break;

          case "error":
            console.error("Server error:", msg.message);
            break;
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    wsRef.current = ws;
  }, [sessionId]);

  const sendAudioChunk = useCallback((buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(buffer);
    }
  }, []);

  const sendMediaPipeMetrics = useCallback(
    (data: { eyeContactScore: number; blinkRate: number; headStability: number }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "mediapipe_metrics", data }));
      }
    },
    []
  );

  const endSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
    }
  }, []);

  useEffect(() => {
    if (sessionId) connect();
    return () => {
      wsRef.current?.close();
    };
  }, [sessionId, connect]);

  return {
    status,
    transcriptChunks,
    feedback,
    sessionComplete,
    sendAudioChunk,
    sendMediaPipeMetrics,
    endSession,
  };
}
