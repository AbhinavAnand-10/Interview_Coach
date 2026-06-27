"use client";

import { useEffect, useRef, useState } from "react";

export interface TrackingMetrics {
  eyeContactScore: number;
  blinkRate: number;
  headStability: number;
  faceDetected: boolean;
  isTracking: boolean;
}

const DEFAULT_METRICS: TrackingMetrics = {
  eyeContactScore: 0,
  blinkRate: 0,
  headStability: 100,
  faceDetected: false,
  isTracking: false,
};

// Eye landmark indices for blink detection
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOT = 145;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOT = 374;
const BLINK_THRESHOLD = 0.018; // Normalized distance threshold

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
}

export function useMediaPipe(videoRef: React.RefObject<HTMLVideoElement>) {
  const [metrics, setMetrics] = useState<TrackingMetrics>(DEFAULT_METRICS);
  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const activeRef = useRef(true);

  // Blink tracking
  const blinkTimestampsRef = useRef<number[]>([]);
  const wasBlinkingRef = useRef(false);

  // Head stability
  const nosePosHistoryRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    activeRef.current = true;

    const init = async () => {
      try {
        const { FaceMesh } = await import("@mediapipe/face_mesh");
        const { Camera } = await import("@mediapipe/camera_utils");

        const faceMesh = new FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,   // Enables iris tracking landmarks 468-477
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: any) => {
          if (!activeRef.current) return;

          if (!results.multiFaceLandmarks?.length) {
            setMetrics((m) => ({ ...m, faceDetected: false }));
            return;
          }

          const lm = results.multiFaceLandmarks[0];
          const now = Date.now();

          // ── 1. Blink detection (EAR) ─────────────────────────────────
          const leftEAR =
            Math.abs(lm[LEFT_EYE_TOP].y - lm[LEFT_EYE_BOT].y);
          const rightEAR =
            Math.abs(lm[RIGHT_EYE_TOP].y - lm[RIGHT_EYE_BOT].y);
          const ear = (leftEAR + rightEAR) / 2;
          const isBlinking = ear < BLINK_THRESHOLD;

          if (isBlinking && !wasBlinkingRef.current) {
            blinkTimestampsRef.current.push(now);
          }
          wasBlinkingRef.current = isBlinking;

          // Keep only last 60 seconds of blink timestamps
          blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
            (t) => now - t < 60000
          );
          const blinkRate = blinkTimestampsRef.current.length;

          // ── 2. Eye contact (iris centering) ──────────────────────────
          // lm[468] = left iris center, lm[473] = right iris center
          let eyeContactScore = 50;
          if (lm[468] && lm[473]) {
            const lIrisX = lm[468].x;
            const rIrisX = lm[473].x;
            const lOuterX = lm[33].x;
            const lInnerX = lm[133].x;
            const rInnerX = lm[362].x;
            const rOuterX = lm[263].x;

            const lWidth = Math.abs(lOuterX - lInnerX) || 0.01;
            const rWidth = Math.abs(rInnerX - rOuterX) || 0.01;
            const lCenterX = (lOuterX + lInnerX) / 2;
            const rCenterX = (rInnerX + rOuterX) / 2;

            const lDev = Math.abs(lIrisX - lCenterX) / lWidth;
            const rDev = Math.abs(rIrisX - rCenterX) / rWidth;
            const avgDev = (lDev + rDev) / 2;

            eyeContactScore = Math.max(0, Math.min(100, 100 - avgDev * 250));
          }

          // ── 3. Head stability (nose tip movement variance) ────────────
          const noseTip = { x: lm[1].x, y: lm[1].y };
          nosePosHistoryRef.current.push(noseTip);
          if (nosePosHistoryRef.current.length > 90) {
            nosePosHistoryRef.current.shift();
          }

          const varX = variance(nosePosHistoryRef.current.map((p) => p.x));
          const varY = variance(nosePosHistoryRef.current.map((p) => p.y));
          const totalVar = (varX + varY) * 10000;
          const headStability = Math.max(0, Math.min(100, 100 - totalVar * 5));

          setMetrics({
            eyeContactScore: Math.round(eyeContactScore),
            blinkRate,
            headStability: Math.round(headStability),
            faceDetected: true,
            isTracking: true,
          });
        });

        faceMeshRef.current = faceMesh;

        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (faceMeshRef.current && videoRef.current && activeRef.current) {
                await faceMeshRef.current.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });
          await camera.start();
          cameraRef.current = camera;
        }
      } catch (err) {
        console.warn("MediaPipe failed to load:", err);
        setMetrics((m) => ({ ...m, isTracking: false }));
      }
    };

    init();

    return () => {
      activeRef.current = false;
      cameraRef.current?.stop();
      faceMeshRef.current?.close();
    };
  }, [videoRef]);

  return metrics;
}
