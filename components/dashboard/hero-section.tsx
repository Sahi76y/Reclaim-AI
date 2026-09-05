import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950/80">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Title & Tagline */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm dark:bg-emerald-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
                  RECLAIMAI
                </h1>
                <Badge
                  variant="outline"
                  className="border-slate-300 font-mono text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  v1.0-benchmark
                </Badge>
              </div>
              <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                AI Revenue Recovery Agent
              </p>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            Finds payments at risk, chooses the safest recovery action, and recovers revenue
            automatically — without blindly retrying payments.
          </p>
        </div>

        {/* Prominent Razorpay Test Mode Simulation Disclosure */}
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 p-4 sm:min-w-[320px] dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-mono text-xs font-bold tracking-wider text-amber-900 uppercase dark:text-amber-200">
              RAZORPAY TEST MODE SIMULATION
            </span>
          </div>
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            No real money was moved.
          </p>
          <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80">
            All outcomes and recoveries reflect deterministic simulation benchmarks across 1,000
            payment-risk events.
          </p>
        </div>
      </div>
    </div>
  );
}
