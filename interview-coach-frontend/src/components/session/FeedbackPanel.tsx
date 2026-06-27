"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import type { SessionFeedback } from "@/hooks/useSessionWebSocket";

interface Props {
  feedback: SessionFeedback | null;
  isComplete: boolean;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "bg-emerald-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-semibold text-[var(--text-primary)]">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-subtle overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function FeedbackPanel({ feedback, isComplete }: Props) {
  if (!feedback) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl 
                      border border-default bg-card p-6 text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="mb-3"
        >
          <Sparkles size={28} className="text-indigo-400" />
        </motion.div>
        <p className="text-sm text-muted">
          AI feedback will appear here as you speak
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full flex-col gap-4 overflow-y-auto rounded-2xl 
                 border border-default bg-card p-5"
    >
      {/* Overall score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            {isComplete ? "Final Score" : "Live Score"}
          </span>
        </div>
        <motion.div
          key={feedback.overall_score}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="text-2xl font-bold text-indigo-400"
        >
          {feedback.overall_score}
          <span className="text-sm font-normal text-muted">/100</span>
        </motion.div>
      </div>

      {/* Score bars */}
      <div className="space-y-3">
        <ScoreBar label="Clarity" value={feedback.clarity_score} />
        <ScoreBar label="Confidence" value={feedback.confidence_score} />
        <ScoreBar label="Structure" value={feedback.structure_score} />
      </div>

      {/* Speech stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-subtle p-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {feedback.estimated_wpm}
          </p>
          <p className="text-xs text-muted">Words/min</p>
        </div>
        <div className="rounded-xl bg-subtle p-3 text-center">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {feedback.filler_word_count}
          </p>
          <p className="text-xs text-muted">Filler words</p>
        </div>
      </div>

      {/* Filler word breakdown */}
      <AnimatePresence>
        {feedback.filler_word_count > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
          >
            <p className="mb-2 text-xs font-medium text-muted">Filler words</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(feedback.filler_words)
                .filter(([, count]) => count > 0)
                .map(([word, count]) => (
                  <span
                    key={word}
                    className="rounded-lg bg-amber-500/10 border border-amber-500/20 
                               px-2 py-0.5 text-xs text-amber-400"
                  >
                    "{word}" ×{count}
                  </span>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strengths */}
      {feedback.strengths?.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-400" />
            <p className="text-xs font-medium text-emerald-400">Strengths</p>
          </div>
          <ul className="space-y-1.5">
            {feedback.strengths?.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-xs text-[var(--text-primary)] leading-relaxed"
              >
                • {s}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {feedback.improvements?.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingUp size={13} className="text-indigo-400" />
            <p className="text-xs font-medium text-indigo-400">Improvements</p>
          </div>
          <ul className="space-y-1.5">
            {feedback.improvements?.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-xs text-[var(--text-primary)] leading-relaxed"
              >
                • {s}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      {feedback.summary && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
          <p className="text-xs leading-relaxed text-[var(--text-primary)]">
            {feedback.summary}
          </p>
        </div>
      )}
    </motion.div>
  );
}
