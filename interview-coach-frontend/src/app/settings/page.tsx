"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, AtSign, Moon, Sun, Shield, BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

interface SessionWithAnalytics {
  id: string;
  status: string;
  duration_seconds: number | null;
  analytics: { overall_score: number } | null;
}

const card = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<SessionWithAnalytics[]>([]);

  useEffect(() => {
    setMounted(true);
    apiFetch<SessionWithAnalytics[]>("/sessions/with-analytics")
      .then(setSessions)
      .catch(console.error);
  }, []);

  const completed = sessions.filter(s => s.status === "completed" && s.analytics);
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, x) => s + (x.analytics?.overall_score ?? 0), 0) / completed.length)
    : 0;
  const totalMinutes = Math.round(
    completed.reduce((s, x) => s + (x.duration_seconds ?? 0), 0) / 60
  );

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Shield },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="mt-1 text-muted">Manage your account and preferences</p>
      </motion.div>

      <div className="mx-auto max-w-2xl space-y-6">

        {/* Profile card */}
        <motion.div variants={card} initial="hidden" animate="show"
          className="rounded-2xl border border-default bg-card p-6">
          <h2 className="mb-5 font-semibold text-[var(--text-primary)]">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white">
              {user?.full_name?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {user?.full_name ?? user?.username}
              </p>
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: User, label: "Full Name", value: user?.full_name ?? "—" },
              { icon: AtSign, label: "Username", value: `@${user?.username}` },
              { icon: Mail, label: "Email", value: user?.email ?? "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl bg-subtle p-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card">
                  <Icon size={14} className="text-muted" />
                </div>
                <div>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Theme */}
        <motion.div variants={card} initial="hidden" animate="show"
          className="rounded-2xl border border-default bg-card p-6">
          <h2 className="mb-5 font-semibold text-[var(--text-primary)]">Appearance</h2>
          {mounted && (
            <div className="grid grid-cols-3 gap-3">
              {themes.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    theme === value
                      ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
                      : "border-default bg-subtle text-muted hover:border-indigo-500/40"
                  }`}>
                  <Icon size={20} />
                  <span className="text-sm font-medium capitalize">{label}</span>
                  {theme === value && (
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Stats summary */}
        <motion.div variants={card} initial="hidden" animate="show"
          className="rounded-2xl border border-default bg-card p-6">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-400" />
            <h2 className="font-semibold text-[var(--text-primary)]">Your Stats</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Sessions", value: completed.length },
              { label: "Avg Score", value: avgScore || "–" },
              { label: "Total Time", value: totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h` : `${totalMinutes}m` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-subtle p-4 text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
                <p className="text-xs text-muted mt-1">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Account section */}
        <motion.div variants={card} initial="hidden" animate="show"
          className="rounded-2xl border border-default bg-card p-6">
          <h2 className="mb-5 font-semibold text-[var(--text-primary)]">Account</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-subtle p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Account Status</p>
                <p className="text-xs text-muted">Your account is active</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-subtle p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">AI Model</p>
                <p className="text-xs text-muted">Llama 3 via Ollama (local)</p>
              </div>
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-400">
                Free
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-subtle p-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Transcription</p>
                <p className="text-xs text-muted">faster-whisper base model (local)</p>
              </div>
              <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-400">
                Free
              </span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
