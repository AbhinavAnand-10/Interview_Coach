"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Video, Clock, Award, ChevronRight } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
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
    avg_eye_contact_score: number;
  } | null;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const card = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "–";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<SessionWithAnalytics[]>("/sessions/with-analytics")
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completed = sessions.filter(s => s.status === "completed" && s.analytics);
  const totalSessions = completed.length;
  const avgScore = totalSessions > 0
    ? Math.round(completed.reduce((s, x) => s + (x.analytics?.overall_score ?? 0), 0) / totalSessions)
    : 0;
  const bestScore = totalSessions > 0
    ? Math.round(Math.max(...completed.map(x => x.analytics?.overall_score ?? 0)))
    : 0;
  const totalMinutes = Math.round(
    completed.reduce((s, x) => s + (x.duration_seconds ?? 0), 0) / 60
  );

  const chartData = completed.map((s, i) => ({
    session: `S${i + 1}`,
    overall: Math.round(s.analytics?.overall_score ?? 0),
    clarity: Math.round(s.analytics?.clarity_score ?? 0),
    confidence: Math.round(s.analytics?.confidence_score ?? 0),
    date: formatDate(s.started_at),
  }));

  const recentSessions = [...completed].reverse().slice(0, 4);
  const firstName = user?.full_name?.split(" ")[0] ?? user?.username ?? "there";

  const statsData = [
    { label: "Sessions", value: totalSessions.toString(), sub: "Total completed", icon: Video, color: "bg-indigo-500/10 text-indigo-500" },
    { label: "Avg Score", value: avgScore.toString(), sub: totalSessions > 1 ? `Across ${totalSessions} sessions` : "Keep practicing!", icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-500" },
    { label: "Practice Time", value: totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`, sub: "Total time", icon: Clock, color: "bg-amber-500/10 text-amber-500" },
    { label: "Best Score", value: bestScore.toString(), sub: "Personal best", icon: Award, color: "bg-violet-500/10 text-violet-500" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">
          Hey, {firstName} 👋
        </h1>
        <p className="mt-1 text-muted">
          {totalSessions === 0
            ? "Start your first session to see your progress"
            : `Here's how you're progressing across ${totalSessions} session${totalSessions > 1 ? "s" : ""}`}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={container} initial="hidden" animate="show"
        className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statsData.map((stat) => (
          <motion.div key={stat.label} variants={card}
            className="rounded-2xl border border-default bg-card p-5">
            <div className={`mb-3 inline-flex rounded-xl p-2.5 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">{stat.label}</p>
            <p className="text-xs text-muted">{stat.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Chart */}
      {chartData.length > 1 ? (
        <motion.div variants={card} initial="hidden" animate="show"
          className="mb-6 rounded-2xl border border-default bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Score Trends</h2>
              <p className="text-sm text-muted">Your improvement across sessions</p>
            </div>
            <div className="flex gap-4 text-xs text-muted">
              {[["Overall", "#6366f1"], ["Clarity", "#10b981"], ["Confidence", "#f59e0b"]].map(([l, c]) => (
                <span key={l} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />{l}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                {[["gO", "#6366f1"], ["gCl", "#10b981"], ["gCo", "#f59e0b"]].map(([id, color]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="session" tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", color: "var(--text-primary)" }} />
              <Area type="monotone" dataKey="overall" stroke="#6366f1" fill="url(#gO)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="clarity" stroke="#10b981" fill="url(#gCl)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="confidence" stroke="#f59e0b" fill="url(#gCo)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      ) : null}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <motion.div variants={card} initial="hidden" animate="show" className="mb-6 rounded-2xl border border-default bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">Recent Sessions</h2>
            <Link href="/analytics" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentSessions.map((s) => (
              <Link key={s.id} href={`/session/${s.id}/results`}>
                <motion.div whileHover={{ x: 4 }}
                  className="flex items-center justify-between rounded-xl border border-default bg-subtle p-4 transition-colors hover:border-indigo-500/30">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{s.title}</p>
                    <p className="text-xs text-muted">{formatDate(s.started_at)} · {formatDuration(s.duration_seconds)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-indigo-400">{Math.round(s.analytics?.overall_score ?? 0)}</p>
                      <p className="text-xs text-muted">score</p>
                    </div>
                    <ChevronRight size={16} className="text-muted" />
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <motion.div variants={card} initial="hidden" animate="show"
        className="rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-500/5 p-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
          <Video size={22} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Ready to practice?</h3>
        <p className="mt-1 text-sm text-muted">Start a new session and get real-time AI feedback</p>
        <Link href="/session/new">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="mt-4 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500">
            Start Session
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
