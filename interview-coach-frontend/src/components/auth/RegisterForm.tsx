"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, type: "spring", stiffness: 300, damping: 26 },
  }),
};

// ── Password strength rules ───────────────────────────────────────────────────
const rules = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "Contains a letter", test: (v: string) => /[a-zA-Z]/.test(v) },
  { label: "Contains a number", test: (v: string) => /\d/.test(v) },
];

interface Props {
  onSuccess: () => void;
}

export default function RegisterForm({ onSuccess }: Props) {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const pass = fd.get("password") as string;
    const confirm = fd.get("confirm_password") as string;

    if (pass !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!rules.every((r) => r.test(pass))) {
      setError("Password does not meet requirements");
      setLoading(false);
      return;
    }

    try {
      await register({
        email: fd.get("email") as string,
        username: fd.get("username") as string,
        password: pass,
        full_name: (fd.get("full_name") as string) || undefined,
      });
      onSuccess();
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
    <form method="post" onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* ── Full name ─────────────────────────────────────────────────── */}
      <motion.div custom={0} variants={fieldVariants} initial="hidden" animate="visible">
        <label htmlFor="reg-fullname" className="mb-1.5 block text-sm font-medium text-slate-300">
          Full name <span className="text-slate-500">(optional)</span>
        </label>
        <input
          id="reg-fullname"
          type="text"
          name="full_name"
          autoComplete="name"
          placeholder="Jane Smith"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3
                     text-white placeholder:text-slate-500 outline-none
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
                     transition-all duration-200"
        />
      </motion.div>

      {/* ── Username ──────────────────────────────────────────────────── */}
      <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
        <label htmlFor="reg-username" className="mb-1.5 block text-sm font-medium text-slate-300">
          Username
        </label>
        <input
          id="reg-username"
          type="text"
          name="username"
          autoComplete="username"
          required
          placeholder="jane_smith"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3
                     text-white placeholder:text-slate-500 outline-none
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
                     transition-all duration-200"
        />
      </motion.div>

      {/* ── Email ─────────────────────────────────────────────────────── */}
      <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
        <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-slate-300">
          Email address
        </label>
        <input
          id="reg-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3
                     text-white placeholder:text-slate-500 outline-none
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
                     transition-all duration-200"
        />
      </motion.div>

      {/* ── Password + strength indicator ─────────────────────────────── */}
      <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible">
        <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-slate-300">
          Password
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="new-password"   // ← Tells browser this is for a new account
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12
                       text-white placeholder:text-slate-500 outline-none
                       focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
                       transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Strength rules — animated in when user starts typing */}
        <AnimatePresence>
          {password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden space-y-1"
            >
              {rules.map((rule) => {
                const pass = rule.test(password);
                return (
                  <div key={rule.label} className="flex items-center gap-2">
                    {pass ? (
                      <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle size={12} className="shrink-0 text-slate-500" />
                    )}
                    <span className={`text-xs transition-colors ${pass ? "text-emerald-400" : "text-slate-500"}`}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Confirm password ──────────────────────────────────────────── */}
      <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="visible">
        <label htmlFor="reg-confirm" className="mb-1.5 block text-sm font-medium text-slate-300">
          Confirm password
        </label>
        <input
          id="reg-confirm"
          type="password"
          name="confirm_password"
          autoComplete="new-password"
          required
          placeholder="••••••••"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3
                     text-white placeholder:text-slate-500 outline-none
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30
                     transition-all duration-200"
        />
      </motion.div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* ── Submit ────────────────────────────────────────────────────── */}
      <motion.button
        custom={5}
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
                   focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={15} className="animate-spin" />
            Creating account…
          </span>
        ) : (
          "Create account"
        )}
      </motion.button>
    </form>
  );
}
