"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useMediaPipe } from "@/hooks/useMediaPipe";
import MetricsOverlay from "./MetricsOverlay";

interface Props {
  onMetrics?: (metrics: {
    eyeContactScore: number;
    blinkRate: number;
    headStability: number;
  }) => void;
}

export default function CameraPane({ onMetrics }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const metrics = useMediaPipe(videoRef);

  // Start camera
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Forward metrics to parent (for WebSocket transmission)
  useEffect(() => {
    if (metrics.faceDetected && onMetrics) {
      onMetrics({
        eyeContactScore: metrics.eyeContactScore,
        blinkRate: metrics.blinkRate,
        headStability: metrics.headStability,
      });
    }
  }, [metrics, onMetrics]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full scale-x-[-1] object-cover"  // Mirror the feed
        style={{ minHeight: "320px" }}
      />

      {/* Dark gradient at bottom for overlay readability */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />

      {/* LIVE recording indicator */}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <motion.div
          className="h-2.5 w-2.5 rounded-full bg-red-500"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
        <span className="text-xs font-semibold text-white/90 tracking-widest">LIVE</span>
      </div>

      {/* SVG pulse wave */}
      <div className="absolute inset-x-0 bottom-16 px-4">
        <svg viewBox="0 0 400 40" className="w-full opacity-50" preserveAspectRatio="none">
          <motion.path
            d="M0 20 Q20 5 40 20 Q60 35 80 20 Q100 5 120 20 Q140 35 160 20 Q180 5 200 20 Q220 35 240 20 Q260 5 280 20 Q300 35 320 20 Q340 5 360 20 Q380 35 400 20"
            stroke="#6366f1"
            strokeWidth="2"
            fill="none"
            animate={{
              d: [
                "M0 20 Q20 5 40 20 Q60 35 80 20 Q100 5 120 20 Q140 35 160 20 Q180 5 200 20 Q220 35 240 20 Q260 5 280 20 Q300 35 320 20 Q340 5 360 20 Q380 35 400 20",
                "M0 20 Q20 35 40 20 Q60 5 80 20 Q100 35 120 20 Q140 5 160 20 Q180 35 200 20 Q220 5 240 20 Q260 35 280 20 Q300 5 320 20 Q340 35 360 20 Q380 5 400 20",
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      </div>

      {/* Floating metrics overlay */}
      <MetricsOverlay metrics={metrics} />
    </div>
  );
}
