"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

type Mode = "login" | "register";

// ── Animation variants ────────────────────────────────────────────────────────

const cardVariants = {
  initial: { opacity: 0, y: 32, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 280, damping: 26 },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.97,
    transition: { duration: 0.18 },
  },
};

const orbVariants = {
  left: {
    animate: {
      x: [0, 70, -20, 0],
      y: [0, -50, 30, 0],
      transition: { duration: 14, repeat: Infinity, ease: "easeInOut" },
    },
  },
  right: {
    animate: {
      x: [0, -60, 40, 0],
      y: [0, 60, -40, 0],
      transition: { duration: 18, repeat: Infinity, ease: "easeInOut" },
    },
  },
};

export default function AuthCard() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 p-4">
      {/* ── Animated background orbs ──────────────────────────────────── */}
      <motion.div
        className="pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px]"
        style={{ top: "5%", left: "-10%" }}
        animate={orbVariants.left.animate}
      />
      <motion.div
        className="pointer-events-none absolute h-[400px] w-[400px] rounded-full bg-violet-600/20 blur-[100px]"
        style={{ bottom: "5%", right: "-5%" }}
        animate={orbVariants.right.animate}
      />

      {/* ── Card container ─────────────────────────────────────────────── */}
      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 text-center"
        >
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.883v6.234a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">InterviewAI</h1>
          <p className="mt-1 text-sm text-slate-400">Master your presence, ace every interview</p>
        </motion.div>

        {/* ── Mode tabs ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mb-5 flex rounded-2xl bg-white/5 p-1 backdrop-blur-sm ring-1 ring-white/10"
        >
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="relative flex-1 rounded-xl py-2.5 text-sm font-medium capitalize transition-colors duration-150"
            >
              {/* Sliding indicator — Framer Motion layout animation */}
              {mode === m && (
                <motion.div
                  layoutId="auth-tab"
                  className="absolute inset-0 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-900/40"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 transition-colors duration-150 ${
                  mode === m ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </span>
            </button>
          ))}
        </motion.div>

        {/* ── Morphing form card ────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
          >
            {mode === "login" ? (
              <LoginForm />
            ) : (
              <RegisterForm onSuccess={() => setMode("login")} />
            )}
          </motion.div>
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 text-center text-xs text-slate-500"
        >
          By continuing, you agree to our Terms and Privacy Policy.
        </motion.p>
      </div>
    </div>
  );
}
