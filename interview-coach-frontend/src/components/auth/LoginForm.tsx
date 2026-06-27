"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

// ── Field animation ───────────────────────────────────────────────────────────
const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, type: "spring", stiffness: 300, damping: 26 },
  }),
};

export default function LoginForm() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // IMPORTANT: This MUST be a real <form method="post"> element, not a <div>.
  //
  // The browser's credential manager (Chrome, Firefox, Safari) observes the
  // following signals to decide whether to offer "Save Password?":
  //
  //   1. A real <form> element that was submitted (not just fetch()-ed)
  //   2. An input with autocomplete="username" (maps to email fields too)
  //   3. An input with autocomplete="current-password"
  //   4. The page navigating (or not throwing a visible error) after submit
  //
  // We call e.preventDefault() but still programmatically navigate on success
  // via router.push('/dashboard'), which satisfies condition 4.
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    try {
      await login({
        email: fd.get("email") as string,
        password: fd.get("password") as string,
        remember_me: fd.get("remember_me") === "on",
      });
      // AuthContext.login() calls router.push('/dashboard') on success —
      // that navigation is what triggers the "Save Password?" prompt.
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      method="post"         // ← Required: must be a real form element
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
    >
      {/* ── Email ─────────────────────────────────────────────────────── */}
      <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
        <label
          htmlFor="login-email"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          name="email"                    // ← Semantic name for form data
          autoComplete="username"         // ← Maps email to "username" slot for Chrome/Firefox
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3
                     text-white placeholder:text-slate-500 outline-none
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
                     transition-all duration-200"
        />
      </motion.div>

      {/* ── Password ──────────────────────────────────────────────────── */}
      <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
        <label
          htmlFor="login-password"
          className="mb-1.5 block text-sm font-medium text-slate-300"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"                   // ← Semantic name
            autoComplete="current-password"   // ← Triggers "Save Password?" dialog
            required
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12
                       text-white placeholder:text-slate-500 outline-none
                       focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
                       transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200
                       transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </motion.div>

      {/* ── Remember Me + Forgot Password ─────────────────────────────── */}
      <motion.div
        custom={2}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-between"
      >
        <label className="group flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="remember_me"
            className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/5 accent-indigo-500"
          />
          <span className="text-sm text-slate-400 transition-colors group-hover:text-slate-200">
            Remember me for 30 days
          </span>
        </label>
        <a
          href="/forgot-password"
          className="text-sm text-indigo-400 transition-colors hover:text-indigo-300"
        >
          Forgot password?
        </a>
      </motion.div>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-xl border border-red-500/25 bg-red-500/10
                     px-4 py-3 text-sm text-red-300"
        >
          {error}
        </motion.div>
      )}

      {/* ── Submit ────────────────────────────────────────────────────── */}
      <motion.button
        custom={3}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        type="submit"
        disabled={loading}
        whileHover={{ scale: loading ? 1 : 1.01 }}
        whileTap={{ scale: loading ? 1 : 0.98 }}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white
                   transition-colors duration-200 hover:bg-indigo-500
                   disabled:cursor-not-allowed disabled:opacity-60
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                   focus:ring-offset-transparent"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={15} className="animate-spin" />
            Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </motion.button>
    </form>
  );
}
