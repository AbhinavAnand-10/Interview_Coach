"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, ArrowLeft } from "lucide-react";
import Link from "next/link";

import CameraPane from "@/components/session/CameraPane";
import TranscriptPane from "@/components/session/TranscriptPane";
import FeedbackPanel from "@/components/session/FeedbackPanel";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSessionWebSocket } from "@/hooks/useSessionWebSocket";

const QUESTIONS = [
  "Tell me about yourself and your background.",
  "What is your greatest professional strength?",
  "Describe a challenging project and how you handled it.",
  "Where do you see yourself in 5 years?",
  "Why do you want to work at this company?",
  "Tell me about a time you worked in a team under pressure.",
  "What is your biggest weakness and how do you manage it?",
  "How do you handle criticism or feedback?",
];

export default function SessionRoomPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const router = useRouter();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [ending, setEnding] = useState(false);

  const {
    status,
    transcriptChunks,
    feedback,
    sessionComplete,
    sendAudioChunk,
    sendMediaPipeMetrics,
    endSession,
  } = useSessionWebSocket(sessionId);

  const { recording, start, stop, error: micError } = useAudioRecorder({
    onChunk: sendAudioChunk,
    chunkIntervalMs: 3000,
  });

  const handleStart = async () => {
    await start();
    setHasStarted(true);
  };

  const handleStop = () => {
    setEnding(true);
    stop();
    endSession();
    // Give backend 2s to save analytics then redirect to results
    setTimeout(() => {
      router.push(`/session/${sessionId}/results`);
    }, 2000);
  };

  const handleMetrics = useCallback(
    (metrics: { eyeContactScore: number; blinkRate: number; headStability: number }) => {
      sendMediaPipeMetrics(metrics);
    },
    [sendMediaPipeMetrics]
  );

  return (
    <div className="flex h-screen flex-col bg-base overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-default bg-card px-6 py-3 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
          Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${
              status === "connected" ? "bg-emerald-400" :
              status === "connecting" ? "bg-amber-400 animate-pulse" :
              "bg-red-400"
            }`} />
            <span className="text-xs text-muted capitalize">{status}</span>
          </div>

          {!hasStarted ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStart}
              disabled={status !== "connected"}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2
                         text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Mic size={15} />
              Start Recording
            </motion.button>
          ) : ending ? (
            <div className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm text-muted">
              <motion.div
                className="h-3 w-3 rounded-full border-2 border-indigo-400 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              Saving results…
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStop}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2
                         text-sm font-semibold text-white hover:bg-red-500"
            >
              <Square size={13} fill="white" />
              End Session
            </motion.button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-4 overflow-hidden p-4">
        {/* Left column: Camera + Question */}
        <div className="flex w-[52%] shrink-0 flex-col gap-3">
          <div style={{ height: "calc(100% - 110px)" }}>
            <CameraPane onMetrics={handleMetrics} />
          </div>

          <div className="shrink-0 rounded-2xl border border-default bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted">
                Question {questionIndex + 1} / {QUESTIONS.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setQuestionIndex((i) => Math.max(i - 1, 0))}
                  disabled={questionIndex === 0}
                  className="rounded-lg px-2 py-1 text-xs text-muted hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setQuestionIndex((i) => Math.min(i + 1, QUESTIONS.length - 1))}
                  disabled={questionIndex === QUESTIONS.length - 1}
                  className="rounded-lg px-2 py-1 text-xs text-muted hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={questionIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-sm font-medium text-[var(--text-primary)]"
              >
                {QUESTIONS[questionIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Right column: Transcript + Feedback */}
        <div className="flex flex-1 flex-col gap-3 min-w-0">
          <div className="flex-1 min-h-0">
            <TranscriptPane chunks={transcriptChunks} isRecording={recording} />
          </div>
          <div className="h-[44%] min-h-0">
            <FeedbackPanel feedback={feedback} isComplete={sessionComplete} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {micError && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-xl border
                       border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 backdrop-blur"
          >
            {micError}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
