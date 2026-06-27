"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Video, Mic, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

const SESSION_TYPES = [
  { value: "interview", label: "Job Interview", emoji: "💼", desc: "Practice common interview questions" },
  { value: "presentation", label: "Presentation", emoji: "📊", desc: "Rehearse a talk or pitch" },
  { value: "pitch", label: "Startup Pitch", emoji: "🚀", desc: "Refine your investor pitch" },
];

export default function NewSessionPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [sessionType, setSessionType] = useState("interview");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ id: string }>("/sessions", {
        method: "POST",
        body: JSON.stringify({
          title: title || `${sessionType} session`,
          session_type: sessionType,
        }),
      });
      router.push(`/session/${data.id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
            <Video size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">New Session</h1>
          <p className="mt-1 text-sm text-muted">Choose your session type and start practicing</p>
        </div>

        <div className="mb-5 space-y-3">
          {SESSION_TYPES.map((type) => (
            <motion.button
              key={type.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSessionType(type.value)}
              className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                sessionType === type.value
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-default bg-card hover:border-indigo-500/40"
              }`}
            >
              <span className="text-2xl">{type.emoji}</span>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{type.label}</p>
                <p className="text-xs text-muted">{type.desc}</p>
              </div>
              {sessionType === type.value && (
                <div className="ml-auto h-3 w-3 rounded-full bg-indigo-500" />
              )}
            </motion.button>
          ))}
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-sm text-muted">Session title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g. "Google SWE Interview Practice"`}
            className="w-full rounded-xl border border-default bg-card px-4 py-3 text-sm
                       text-[var(--text-primary)] placeholder:text-muted outline-none
                       focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mb-5 flex items-start gap-2 rounded-xl bg-subtle px-4 py-3">
          <Mic size={14} className="mt-0.5 shrink-0 text-indigo-400" />
          <p className="text-xs text-muted">
            This session uses your microphone and camera. Please allow access when prompted.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white
                     transition-colors hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={15} className="animate-spin" />
              Starting session…
            </span>
          ) : (
            "Start Session →"
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
