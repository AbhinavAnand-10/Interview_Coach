"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import type { TranscriptChunk } from "@/hooks/useSessionWebSocket";

interface Props {
  chunks: TranscriptChunk[];
  isRecording: boolean;
}

export default function TranscriptPane({ chunks, isRecording }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest transcript
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-default bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-default px-4 py-3">
        <FileText size={16} className="text-indigo-400" />
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Live Transcript
        </span>
        {isRecording && (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="ml-auto text-xs text-indigo-400"
          >
            Transcribing…
          </motion.span>
        )}
      </div>

      {/* Transcript content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {chunks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full items-center justify-center text-center"
            >
              <div>
                <div className="mb-2 text-3xl">🎤</div>
                <p className="text-sm text-muted">
                  {isRecording
                    ? "Listening… start speaking"
                    : "Press Start to begin your session"}
                </p>
              </div>
            </motion.div>
          ) : (
            chunks.map((chunk) => (
              <motion.div
                key={chunk.chunkIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="group relative"
              >
                <span className="absolute -left-1 top-0.5 text-[10px] text-muted opacity-0 
                                 group-hover:opacity-100 transition-opacity">
                  {formatTime(chunk.startTime)}
                </span>
                <p className="pl-1 text-sm leading-relaxed text-[var(--text-primary)]">
                  {chunk.text}
                </p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
