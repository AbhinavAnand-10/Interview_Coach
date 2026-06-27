"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Zap, Activity, CheckCircle2, TrendingUp, FileText, Award } from "lucide-react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";

interface Analytics {
  overall_score: number;
  clarity_score: number;
  confidence_score: number;
  structure_score: number;
  avg_wpm: number;
  filler_word_count: number;
  filler_words: Record<string, number>;
  avg_eye_contact_score: number;
  avg_blink_rate: number;
  head_stability_score: number;
  ai_summary: string;
  ai_strengths: string[];
  ai_improvements: string[];
}

interface TranscriptData { full_text: string; }

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const r = 36, circ = 2 * Math.PI * r, dash = ((score ?? 0) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth="8" />
          <motion.circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-[var(--text-primary)]">{Math.round(score ?? 0)}</span>
        </div>
      </div>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-default bg-card p-4">
      <div className={`mb-2 inline-flex rounded-xl p-2 ${color}`}><Icon size={16} /></div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value ?? "–"}</p>
      <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </motion.div>
  );
}

export default function ResultsPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Waiting for AI analysis…");
  const [dots, setDots] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const MAX_TRIES = 45;
    const msgs = ["Waiting for AI analysis…","Ollama is processing your speech…","Scoring clarity and confidence…","Almost there…"];

    async function poll() {
      while (tries < MAX_TRIES && !cancelled) {
        tries++;
        setDots(tries);
        setLoadingMsg(msgs[Math.min(Math.floor(tries / 8), msgs.length - 1)]);
        try {
          // Sequential — never parallel — to avoid token rotation race conditions
          const a = await apiFetch<Analytics>(`/sessions/${sessionId}/analytics`);
          const t = await apiFetch<TranscriptData>(`/sessions/${sessionId}/transcript`);
          if (!cancelled) { setAnalytics(a); setTranscript(t); }
          return;
        } catch (e: any) {
          if (e?.status !== 404) { setFailed(true); return; }
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      if (!cancelled) setFailed(true);
    }
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (!analytics) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-base">
        {failed ? (
          <>
            <p className="text-red-400">Could not load analytics.</p>
            <button onClick={() => window.location.reload()}
              className="rounded-xl bg-indigo-600 px-6 py-2 text-sm text-white hover:bg-indigo-500">
              Retry
            </button>
            <Link href="/dashboard" className="text-sm text-muted hover:underline">← Dashboard</Link>
          </>
        ) : (
          <>
            <motion.div className="h-14 w-14 rounded-full border-4 border-indigo-500/20 border-t-indigo-500"
              animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
            <div className="text-center">
              <motion.p key={loadingMsg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="font-medium text-[var(--text-primary)]">{loadingMsg}</motion.p>
              <p className="mt-1 text-sm text-muted">Ollama can take up to 90 seconds</p>
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: Math.min(dots, 12) }).map((_, i) => (
                <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                  className="h-2 w-2 rounded-full bg-indigo-500" />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base pb-16">
      <div className="sticky top-0 z-10 border-b border-default bg-card/80 backdrop-blur px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={16} />Dashboard
          </Link>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Session Results</h1>
          <div className="w-24" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-6 pt-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1">
            <Award size={14} className="text-indigo-400" />
            <span className="text-xs font-medium text-indigo-400">Overall Performance</span>
          </div>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.2 }}
            className="text-7xl font-bold text-indigo-400">{Math.round(analytics.overall_score ?? 0)}</motion.div>
          <p className="mt-1 text-muted">out of 100</p>
          {analytics.ai_summary && (
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-primary)]">{analytics.ai_summary}</p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-default bg-card p-6">
          <h2 className="mb-6 font-semibold text-[var(--text-primary)]">Score Breakdown</h2>
          <div className="flex justify-around flex-wrap gap-6">
            <ScoreRing score={analytics.clarity_score} label="Clarity" color="#6366f1" />
            <ScoreRing score={analytics.confidence_score} label="Confidence" color="#10b981" />
            <ScoreRing score={analytics.structure_score} label="Structure" color="#f59e0b" />
            <ScoreRing score={analytics.avg_eye_contact_score} label="Eye Contact" color="#8b5cf6" />
            <ScoreRing score={analytics.head_stability_score} label="Stability" color="#06b6d4" />
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Zap} label="Words/min" value={Math.round(analytics.avg_wpm ?? 0)} sub="Ideal: 120–160" color="bg-indigo-500/10 text-indigo-400" />
          <StatCard icon={FileText} label="Filler words" value={analytics.filler_word_count ?? 0} sub="Lower is better" color="bg-amber-500/10 text-amber-400" />
          <StatCard icon={Eye} label="Eye contact" value={`${Math.round(analytics.avg_eye_contact_score ?? 0)}%`} sub="Ideal: above 70%" color="bg-emerald-500/10 text-emerald-400" />
          <StatCard icon={Activity} label="Blink rate" value={`${Math.round(analytics.avg_blink_rate ?? 0)}/min`} sub="Normal: 15–20" color="bg-violet-500/10 text-violet-400" />
        </div>

        {analytics.filler_words && Object.values(analytics.filler_words).some(v => v > 0) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-default bg-card p-6">
            <h2 className="mb-4 font-semibold text-[var(--text-primary)]">Filler Word Breakdown</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.filler_words).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
                .map(([word, count]) => (
                  <div key={word} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm">
                    <span className="font-medium text-amber-400">"{word}"</span>
                    <span className="ml-2 text-muted">×{count}</span>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {analytics.ai_strengths?.length > 0 && (
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl border border-emerald-500/20 bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <h2 className="font-semibold text-emerald-400">Strengths</h2>
              </div>
              <ul className="space-y-2">
                {analytics.ai_strengths.map((s, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                    <span className="mt-1 text-emerald-400">✓</span>{s}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}

          {analytics.ai_improvements?.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl border border-indigo-500/20 bg-card p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-400" />
                <h2 className="font-semibold text-indigo-400">Areas to Improve</h2>
              </div>
              <ul className="space-y-2">
                {analytics.ai_improvements.map((s, i) => (
                  <motion.li key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
                    <span className="mt-1 text-indigo-400">→</span>{s}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>

        {transcript?.full_text && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-default bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" />
              <h2 className="font-semibold text-[var(--text-primary)]">Full Transcript</h2>
            </div>
            <p className="text-sm leading-relaxed text-[var(--text-primary)]">{transcript.full_text}</p>
          </motion.div>
        )}

        <div className="text-center">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/session/new")}
            className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
            Practice Again →
          </motion.button>
        </div>
      </div>
    </div>
  );
}
