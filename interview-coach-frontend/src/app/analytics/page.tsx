"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";
import { ChevronRight, Video, TrendingUp, Eye, Zap } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface SessionWithAnalytics {
  id: string;
  title: string;
  session_type: string;
  status: string;
  duration_seconds: number | null;
  started_at: string;
  analytics: {
    overall_score: number;
    clarity_score: number;
    confidence_score: number;
    structure_score: number;
    avg_wpm: number;
    filler_word_count: number;
    avg_eye_contact_score: number;
    head_stability_score: number;
  } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDuration(s: number | null) {
  if (!s) return "–";
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function scoreColor(score: number) {
  if (score >= 70) return "text-emerald-400";
  if (score >= 45) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number) {
  if (score >= 70) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 45) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

const typeEmoji: Record<string, string> = {
  interview: "💼", presentation: "📊", pitch: "🚀",
};

const card = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<SessionWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "interview" | "presentation" | "pitch">("all");

  useEffect(() => {
    apiFetch<SessionWithAnalytics[]>("/sessions/with-analytics")
      .then(data => setSessions(data.filter(s => s.status === "completed" && s.analytics)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? sessions : sessions.filter(s => s.session_type === filter);
  const latest = sessions[sessions.length - 1];

  const chartData = sessions.map((s, i) => ({
    session: `S${i + 1}`,
    overall: Math.round(s.analytics?.overall_score ?? 0),
    clarity: Math.round(s.analytics?.clarity_score ?? 0),
    confidence: Math.round(s.analytics?.confidence_score ?? 0),
  }));

  const radarData = latest?.analytics ? [
    { metric: "Clarity", value: Math.round(latest.analytics.clarity_score ?? 0) },
    { metric: "Confidence", value: Math.round(latest.analytics.confidence_score ?? 0) },
    { metric: "Structure", value: Math.round(latest.analytics.structure_score ?? 0) },
    { metric: "Eye Contact", value: Math.round(latest.analytics.avg_eye_contact_score ?? 0) },
    { metric: "Stability", value: Math.round(latest.analytics.head_stability_score ?? 0) },
  ] : [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div className="h-10 w-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500"
          animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">📊</div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">No sessions yet</h2>
        <p className="text-muted">Complete your first session to see analytics here</p>
        <Link href="/session/new">
          <button className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            Start a Session
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Analytics</h1>
        <p className="mt-1 text-muted">{sessions.length} completed session{sessions.length > 1 ? "s" : ""}</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Score trend */}
        {chartData.length > 1 && (
          <motion.div variants={card} initial="hidden" animate="show"
            className="rounded-2xl border border-default bg-card p-6">
            <h2 className="mb-4 font-semibold text-[var(--text-primary)]">Score Over Time</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  {[["gO", "#6366f1"], ["gCl", "#10b981"]].map(([id, color]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="session" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--text-primary)" }} />
                <Area type="monotone" dataKey="overall" stroke="#6366f1" fill="url(#gO)" strokeWidth={2} dot={false} name="Overall" />
                <Area type="monotone" dataKey="clarity" stroke="#10b981" fill="url(#gCl)" strokeWidth={2} dot={false} name="Clarity" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Radar — latest session */}
        {radarData.length > 0 && (
          <motion.div variants={card} initial="hidden" animate="show"
            className="rounded-2xl border border-default bg-card p-6">
            <h2 className="mb-1 font-semibold text-[var(--text-primary)]">Latest Session Skills</h2>
            <p className="mb-2 text-xs text-muted">{formatDate(latest.started_at)}</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Radar name="Score" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {(["all", "interview", "presentation", "pitch"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-card border border-default text-muted hover:text-[var(--text-primary)]"
            }`}>
            {f === "all" ? "All" : `${typeEmoji[f]} ${f}`}
          </button>
        ))}
      </div>

      {/* Session list */}
      <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        initial="hidden" animate="show" className="space-y-3">
        {[...filtered].reverse().map((s) => (
          <motion.div key={s.id} variants={card}>
            <Link href={`/session/${s.id}/results`}>
              <motion.div whileHover={{ x: 3 }}
                className="flex items-center justify-between rounded-2xl border border-default bg-card p-5 transition-colors hover:border-indigo-500/30">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-xl">
                    {typeEmoji[s.session_type] ?? "🎤"}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{s.title}</p>
                    <p className="text-xs text-muted">
                      {formatDate(s.started_at)} · {formatDuration(s.duration_seconds)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Mini scores */}
                  <div className="hidden sm:flex gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Eye size={11} />
                      {Math.round(s.analytics?.avg_eye_contact_score ?? 0)}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={11} />
                      {Math.round(s.analytics?.avg_wpm ?? 0)} wpm
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp size={11} />
                      {s.analytics?.filler_word_count ?? 0} fillers
                    </span>
                  </div>

                  {/* Overall score badge */}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border text-sm font-bold ${scoreBg(s.analytics?.overall_score ?? 0)} ${scoreColor(s.analytics?.overall_score ?? 0)}`}>
                    {Math.round(s.analytics?.overall_score ?? 0)}
                  </div>

                  <ChevronRight size={16} className="text-muted" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
