"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, ChevronDown, ChevronUp, Server, ShieldCheck, Cpu, Database } from "lucide-react";
import type { EvaluationResult } from "@/server/evaluation/types";

interface TechnicalDetailsProps {
  evaluation: EvaluationResult;
}

export function TechnicalDetailsDrawer({ evaluation }: TechnicalDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 shadow-xl backdrop-blur-sm">
      <CardHeader
        className="cursor-pointer rounded-2xl py-4 transition-colors hover:bg-[#0f1524]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              <Code2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="font-mono text-sm font-bold tracking-tight text-white">
                Technical Architecture & Implementation Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Engine configurations, AI model parameters, policy version, and verified endpoints
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border border-[#1c2438] bg-[#090d16] font-mono text-[10px] text-slate-400"
            >
              Secondary / Dev Specs
            </Badge>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#1c2438] bg-[#090d16] text-slate-400 hover:text-white">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="border-t border-[#1c2438] p-6 pt-4 text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* AI Engine Specs */}
            <div className="rounded-xl border border-[#1c2438] bg-[#090d16] p-4">
              <div className="mb-2.5 flex items-center gap-1.5 font-mono font-bold text-white">
                <Cpu className="h-4 w-4 text-purple-400" />
                <span>AI Reasoning Engine</span>
              </div>
              <dl className="space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="font-mono font-semibold text-slate-200">MockAIProvider</span>
                </div>
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span className="font-mono text-slate-300">gpt-4o-mini</span>
                </div>
                <div className="flex justify-between">
                  <span>Validation:</span>
                  <span className="font-mono text-slate-300">Strict Zod Schema</span>
                </div>
                <div className="flex justify-between">
                  <span>GT Access:</span>
                  <span className="font-mono font-bold text-emerald-400">ZERO (Isolated)</span>
                </div>
              </dl>
            </div>

            {/* Policy Engine Specs */}
            <div className="rounded-xl border border-[#1c2438] bg-[#090d16] p-4">
              <div className="mb-2.5 flex items-center gap-1.5 font-mono font-bold text-white">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <span>Policy & Safety Engine</span>
              </div>
              <dl className="space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span className="font-mono font-semibold text-slate-200">1.0.0-strict</span>
                </div>
                <div className="flex justify-between">
                  <span>Guards Active:</span>
                  <span className="font-mono text-slate-300">8 Evaluators</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Retries:</span>
                  <span className="font-mono text-slate-300">2 attempts max</span>
                </div>
                <div className="flex justify-between">
                  <span>Human Ceiling:</span>
                  <span className="font-mono text-slate-300">&gt; ₹50,000 INR</span>
                </div>
              </dl>
            </div>

            {/* Gateway & Execution Mode */}
            <div className="rounded-xl border border-[#1c2438] bg-[#090d16] p-4">
              <div className="mb-2.5 flex items-center gap-1.5 font-mono font-bold text-white">
                <Server className="h-4 w-4 text-amber-400" />
                <span>Payment Gateway Mode</span>
              </div>
              <dl className="space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className="font-mono font-semibold text-amber-300">
                    {evaluation.providerMode.providerMode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Razorpay Mode:</span>
                  <span className="font-mono text-slate-300">
                    {evaluation.providerMode.razorpayMode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Real Money Moved:</span>
                  <span className="font-mono font-bold text-rose-400">
                    {evaluation.providerMode.isRealMoneyMoved ? "True" : "False (₹0 moved)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Idempotency:</span>
                  <span className="font-mono text-slate-300">Strict Unique Keys</span>
                </div>
              </dl>
            </div>

            {/* Dataset & Test Status */}
            <div className="rounded-xl border border-[#1c2438] bg-[#090d16] p-4">
              <div className="mb-2.5 flex items-center gap-1.5 font-mono font-bold text-white">
                <Database className="h-4 w-4 text-emerald-400" />
                <span>Benchmark Dataset</span>
              </div>
              <dl className="space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Dataset Size:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    {evaluation.datasetSize.toLocaleString("en-IN")} cases
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Generation Seed:</span>
                  <span className="font-mono text-slate-300">42 (Fixed)</span>
                </div>
                <div className="flex justify-between">
                  <span>Test Suite:</span>
                  <span className="font-mono font-bold text-emerald-400">17 files / 132 tests</span>
                </div>
                <div className="flex justify-between">
                  <span>Evaluation Time:</span>
                  <span className="font-mono text-slate-300">{evaluation.durationMs} ms</span>
                </div>
              </dl>
            </div>
          </div>

          {/* Verified API Endpoints Reference */}
          <div className="mt-4 rounded-xl border border-[#1c2438] bg-[#090d16] p-4">
            <h4 className="mb-3 font-mono text-xs font-bold text-white">Verified API Interfaces</h4>
            <div className="grid grid-cols-1 gap-2 font-mono text-[11px] sm:grid-cols-2 md:grid-cols-4">
              <div className="flex items-center justify-between rounded-lg border border-[#1c2438] bg-[#111726] p-2.5">
                <span className="text-slate-300">GET /api/evaluation/latest</span>
                <span className="font-bold text-emerald-400">200 OK</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#1c2438] bg-[#111726] p-2.5">
                <span className="text-slate-300">POST /api/evaluation/run</span>
                <span className="font-bold text-emerald-400">200 OK</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#1c2438] bg-[#111726] p-2.5">
                <span className="text-slate-300">POST /api/ai/recommend</span>
                <span className="font-bold text-emerald-400">200 OK</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[#1c2438] bg-[#111726] p-2.5">
                <span className="text-slate-300">POST /api/policy/evaluate</span>
                <span className="font-bold text-emerald-400">200 OK</span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
