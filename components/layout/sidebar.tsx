"use client";

import React from "react";
import {
  LayoutDashboard,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  CreditCard,
  FileText,
  Sliders,
  CheckCircle2,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "#overview",
    icon: LayoutDashboard,
  },
  {
    label: "Revenue at Risk",
    href: "#risk-radar",
    icon: AlertTriangle,
  },
  {
    label: "AI Diagnosis",
    href: "#ai-diagnosis",
    icon: Sparkles,
  },
  {
    label: "Policy Guardrails",
    href: "#guardrails",
    icon: ShieldAlert,
  },
  {
    label: "Razorpay Actions",
    href: "#razorpay-actions",
    icon: CreditCard,
  },
  {
    label: "Audit Trail",
    href: "#audit-trail",
    icon: FileText,
  },
  {
    label: "Configuration",
    href: "#config",
    icon: Sliders,
  },
];

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot() {
  return window.location.hash || "#overview";
}

function getServerHashSnapshot() {
  return "#overview";
}

export function Sidebar() {
  const activeHref = React.useSyncExternalStore(
    subscribeToHash,
    getHashSnapshot,
    getServerHashSnapshot
  );

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const targetId = href.replace(/^#/, "");
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      e.preventDefault();
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", href);
      window.dispatchEvent(new Event("hashchange"));
    }
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Brand Identity */}
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
            ReclaimAI
          </h1>
          <p className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
            Revenue Recovery
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Platform Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 ${
                    isActive
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                />
                <span>{item.label}</span>
              </div>
            </a>
          );
        })}
      </nav>

      {/* Footer / Architecture Context */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="rounded-md border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-medium">System Status</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
            Razorpay Test Mode
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">Deterministic simulation verified</p>
        </div>
      </div>
    </aside>
  );
}
