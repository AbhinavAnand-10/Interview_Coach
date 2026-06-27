"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Eye, Activity, Zap } from "lucide-react";
import type { TrackingMetrics } from "@/hooks/useMediaPipe";

interface Props {
  metrics: TrackingMetrics;
}

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

function scoreBorder(score: number) {
  if (score >= 70) return "border-emerald-500/40 bg-emerald-500/10";
  if (score >= 40) return "border-amber-500/40 bg-amber-500/10";
  return "border-red-500/40 bg-red-500/10";
}

function Badge({
  icon: Icon,
  label,
  value,
  score,
}: {
  icon: any;
  label: string;
  value: string;
  score: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 
                  backdrop-blur-md text-xs font-medium ${scoreBorder(score)}`}
    >
      <Icon size={11} className={scoreColor(score)} />
      <span className="text-white/70">{label}</span>
      <span className={`font-bold ${scoreColor(score)}`}>{value}</span>
    </motion.div>
  );
}

export default function MetricsOverlay({ metrics }: Props) {
  const blinkScore = metrics.blinkRate >= 5 && metrics.blinkRate <= 25 ? 80 : 35;

  return (
    <div className="absolute bottom-3 left-3 right-3">
      <AnimatePresence>
        {metrics.faceDetected ? (
          <motion.div
            key="metrics"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="flex flex-wrap gap-2"
          >
            <Badge
              icon={Eye}
              label="Eye Contact"
              value={`${metrics.eyeContactScore}%`}
              score={metrics.eyeContactScore}
            />
            <Badge
              icon={Activity}
              label="Stability"
              value={`${metrics.headStability}%`}
              score={metrics.headStability}
            />
            <Badge
              icon={Zap}
              label="Blinks"
              value={`${metrics.blinkRate}/min`}
              score={blinkScore}
            />
          </motion.div>
        ) : (
          <motion.div
            key="no-face"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 
                       text-xs text-white/50 backdrop-blur-md"
          >
            No face detected
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
