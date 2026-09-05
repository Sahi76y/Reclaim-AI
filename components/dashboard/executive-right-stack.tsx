import React from "react";
import { Calendar, ChevronDown, FileText, ShieldCheck, FlaskConical } from "lucide-react";

interface ExecutiveRightStackProps {
  datasetSize: number;
  unsafeActionsPrevented: number;
}

export function ExecutiveRightStack({
  datasetSize,
  unsafeActionsPrevented,
}: ExecutiveRightStackProps) {
  return (
    <div className="flex flex-col gap-3.5">
      {/* Date Filter Pill */}
      <div className="flex items-center justify-between rounded-xl border border-[#1c2438] bg-[#0c1019]/90 px-3.5 py-2.5 shadow-md">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="font-mono text-xs font-semibold text-slate-200">
            Apr 01, 2024 — Apr 30, 2024
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </div>

      {/* Card 1: 1,000 Payment-risk events */}
      <div className="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-b from-[#0e172a]/95 to-[#090d16]/95 p-4 shadow-xl transition-all duration-200 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/15 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-black tracking-tight text-white">
              {datasetSize.toLocaleString("en-IN")}
            </div>
            <div className="text-xs font-bold text-slate-200">Payment-risk events</div>
            <div className="text-[11px] text-slate-400">Used in our evaluation</div>
          </div>
        </div>
      </div>

      {/* Card 2: 201 Unsafe actions prevented */}
      <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0c1926]/95 to-[#090d16]/95 p-4 shadow-xl transition-all duration-200 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-2xl font-black tracking-tight text-white">
              {unsafeActionsPrevented.toLocaleString("en-IN")}
            </div>
            <div className="text-xs font-bold text-slate-200">Unsafe actions prevented</div>
            <div className="text-[11px] text-slate-400">Blocked by policy rules</div>
          </div>
        </div>
      </div>

      {/* Card 3: RAZORPAY TEST MODE SIMULATION */}
      <div className="group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-b from-[#180f2a]/95 to-[#090d16]/95 p-4 shadow-xl transition-all duration-200 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/15 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <div className="font-mono text-xs font-black tracking-wider text-purple-300">
              RAZORPAY TEST MODE SIMULATION
            </div>
            <div className="text-xs font-medium text-slate-300">No real money was moved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
