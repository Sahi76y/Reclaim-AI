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
    <aside className="flex h-screen w-64 flex-col border-r border-[#1c2438] bg-[#090d16] text-slate-200">
      {/* Brand Identity */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[#1c2438] bg-[#07090e]/60 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-rose-700 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]">
          <CheckCircle2 className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-mono text-sm font-extrabold tracking-wider text-white">
              RECLAIM<span className="text-red-500">AI</span>
            </h1>
            <span className="py-0.2 rounded border border-red-500/30 bg-red-500/10 px-1 font-mono text-[9px] font-bold text-red-400">
              AGENT
            </span>
          </div>
          <p className="text-[10px] font-medium tracking-wide text-slate-400">
            AI Revenue Recovery Agent
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        <div className="px-3 pb-2 font-mono text-[10px] font-bold tracking-widest text-slate-500 uppercase">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeHref === item.href;
          return (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "border border-red-500/40 bg-gradient-to-r from-red-600/25 to-red-950/10 text-white shadow-[0_0_16px_rgba(239,68,68,0.2)]"
                  : "text-slate-400 hover:border hover:border-[#1c2438] hover:bg-[#0e1422] hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive
                      ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                      : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                <span className={isActive ? "font-bold text-white" : ""}>{item.label}</span>
              </div>
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]" />
              )}
            </a>
          );
        })}
      </nav>

      {/* Footer / Slide 4 Brand Tagline */}
      <div className="border-t border-[#1c2438] bg-[#07090e]/60 p-4">
        <div className="mb-3 px-2">
          <p className="font-mono text-xs leading-tight font-bold text-slate-400">
            Recover More.
            <br />
            Risk Less.
            <br />
            <span className="text-red-400">Know Why.</span>
          </p>
        </div>

        <div className="rounded-xl border border-[#1c2438] bg-[#0c1019] p-2.5 shadow-inner">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="font-mono font-medium">System Status</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              <span className="font-mono text-[9px] font-bold text-emerald-400">ACTIVE</span>
            </div>
          </div>
          <p className="mt-1 font-mono text-[10px] font-bold text-slate-300">Razorpay Test Mode</p>
        </div>
      </div>
    </aside>
  );
}
