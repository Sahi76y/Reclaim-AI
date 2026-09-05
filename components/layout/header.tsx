import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Server, AlertTriangle } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Merchant Workspace
        </span>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Financial Operations
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Prominent Visible Disclosure */}
        <div className="hidden items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 md:flex dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span>No real money was moved.</span>
        </div>

        <Badge
          variant="secondary"
          className="gap-1.5 border-amber-200 bg-amber-100/60 font-mono text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <Server className="h-3 w-3 text-amber-600" />
          <span>RAZORPAY TEST MODE SIMULATION</span>
        </Badge>

        <Badge variant="guardrail" className="hidden gap-1.5 font-mono text-xs sm:inline-flex">
          <ShieldCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <span>POLICY ENFORCED</span>
        </Badge>
      </div>
    </header>
  );
}
