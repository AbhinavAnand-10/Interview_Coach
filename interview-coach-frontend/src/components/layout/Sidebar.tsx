"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Video, BarChart3, Settings, LogOut, Mic } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard",   href: "/dashboard",  icon: LayoutDashboard },
  { label: "New Session", href: "/session/new", icon: Video },
  { label: "Analytics",  href: "/analytics",   icon: BarChart3 },
  { label: "Settings",   href: "/settings",    icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-default bg-card px-4 py-6">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
          <Mic size={16} className="text-white" />
        </div>
        <span className="text-lg font-bold text-[var(--text-primary)]">InterviewAI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <motion.div whileHover={{ x: 2 }}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "text-white" : "text-muted hover:bg-subtle hover:text-[var(--text-primary)]"
                )}>
                {isActive && (
                  <motion.div layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-indigo-600"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                )}
                <item.icon size={18} className={cn("relative z-10", isActive ? "text-white" : "")} />
                <span className="relative z-10">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-3 border-t border-default pt-4">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {user?.full_name?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {user?.full_name ?? user?.username}
              </p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <button onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted transition-colors hover:bg-red-500/10 hover:text-red-400">
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
