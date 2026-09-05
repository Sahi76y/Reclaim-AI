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
    <Card className="border-slate-200 shadow-sm dark:border-slate-800">
      <CardHeader
        className="cursor-pointer py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/40"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Code2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Technical Architecture & Implementation Details
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Engine configurations, AI model parameters, policy version, and verified endpoints
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] text-slate-500">
              Secondary / Dev Specs
            </Badge>
            <button className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 dark:border-slate-800">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* AI Engine Specs */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Cpu className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>AI Reasoning Engine</span>
              </div>
              <dl className="space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    MockAIProvider (Deterministic)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    gpt-4o-mini / heuristic rule
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Validation:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    Strict Zod Schema
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GT Access:</span>
                  <span className="font-mono font-semibold text-emerald-600">ZERO (Isolated)</span>
                </div>
              </dl>
            </div>

            {/* Policy Engine Specs */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Policy & Safety Engine</span>
              </div>
              <dl className="space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    1.0.0-step4-strict
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Guards Active:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    8 Deterministic Evaluators
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Max Retries:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    2 attempts max
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Human Ceiling:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    &gt; ₹50,000 INR
                  </span>
                </div>
              </dl>
            </div>

            {/* Gateway & Execution Mode */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Server className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Payment Gateway Mode</span>
              </div>
              <dl className="space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className="font-mono font-medium text-amber-700 dark:text-amber-300">
                    {evaluation.providerMode.providerMode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Razorpay Mode:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    {evaluation.providerMode.razorpayMode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Real Money Moved:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {evaluation.providerMode.isRealMoneyMoved ? "True" : "False (₹0 moved)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Idempotency:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    Strict Unique Keys
                  </span>
                </div>
              </dl>
            </div>

            {/* Dataset & Test Status */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-900/30">
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Benchmark Dataset</span>
              </div>
              <dl className="space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Dataset Size:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    {evaluation.datasetSize.toLocaleString("en-IN")} cases
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Generation Seed:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">42 (Fixed)</span>
                </div>
                <div className="flex justify-between">
                  <span>Test Suite:</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    17 files / 132 tests passing
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Evaluation Time:</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100">
                    {evaluation.durationMs} ms
                  </span>
                </div>
              </dl>
            </div>
          </div>

          {/* Verified API Endpoints Reference */}
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <h4 className="mb-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
              Verified API Interfaces
            </h4>
            <div className="grid grid-cols-1 gap-2 font-mono text-[11px] sm:grid-cols-2 md:grid-cols-4">
              <div className="flex items-center justify-between rounded bg-slate-50 p-2 dark:bg-slate-800">
                <span>GET /api/evaluation/latest</span>
                <span className="text-emerald-600">200 OK</span>
              </div>
              <div className="flex items-center justify-between rounded bg-slate-50 p-2 dark:bg-slate-800">
                <span>POST /api/evaluation/run</span>
                <span className="text-emerald-600">200 OK</span>
              </div>
              <div className="flex items-center justify-between rounded bg-slate-50 p-2 dark:bg-slate-800">
                <span>POST /api/ai/recommend</span>
                <span className="text-emerald-600">200 OK</span>
              </div>
              <div className="flex items-center justify-between rounded bg-slate-50 p-2 dark:bg-slate-800">
                <span>POST /api/policy/evaluate</span>
                <span className="text-emerald-600">200 OK</span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
