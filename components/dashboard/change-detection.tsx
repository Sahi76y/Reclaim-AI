"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompare, ShieldAlert, Sliders, Info } from "lucide-react";

interface PolicyDiffExample {
  id: string;
  title: string;
  categoryLabel: string;
  amountFormatted: string;
  triggerReason: string;
  before: {
    origin: string;
    actionLabel: string;
    strategyType: string;
    autonomous: boolean;
    retryCount: number;
    channel: string;
    approvalRequired: boolean;
  };
  after: {
    origin: string;
    decision: string;
    actionLabel: string;
    strategyType: string;
    autonomous: boolean;
    retryCount: number;
    channel: string;
    approvalRequired: boolean;
    policyRule: string;
  };
}

const SAMPLE_DIFFS: PolicyDiffExample[] = [
  {
    id: "diff_01",
    title: "Excessive Retry Safety Intervention",
    categoryLabel: "Temporary Payment Problem",
    amountFormatted: "₹4,200",
    triggerReason:
      "Customer already failed 3 retries. Blindly retrying again risks bank fraud score penalty.",
    before: {
      origin: "AI Recommendation Engine",
      actionLabel: "Direct Smart Retry",
      strategyType: "Automated Gateway Retry",
      autonomous: true,
      retryCount: 3,
      channel: "RAZORPAY_RETRY_API",
      approvalRequired: false,
    },
    after: {
      origin: "Policy Guardrail Engine",
      decision: "MODIFY",
      actionLabel: "Safe Payment Link",
      strategyType: "Customer-Initiated WhatsApp Link",
      autonomous: true,
      retryCount: 0,
      channel: "RAZORPAY_PAYMENT_LINK",
      approvalRequired: false,
      policyRule: "RETRY_LIMIT_GUARD (Max retries exceeded)",
    },
  },
  {
    id: "diff_02",
    title: "High-Value Transaction Human Escalation",
    categoryLabel: "Customer Action Required",
    amountFormatted: "₹85,000",
    triggerReason:
      "Transaction exceeds ₹50,000 automated ceiling. Transferred to VIP support desk.",
    before: {
      origin: "AI Recommendation Engine",
      actionLabel: "Send Payment Link",
      strategyType: "Autonomous Link Dispatch",
      autonomous: true,
      retryCount: 1,
      channel: "RAZORPAY_PAYMENT_LINK",
      approvalRequired: false,
    },
    after: {
      origin: "Policy Guardrail Engine",
      decision: "ESCALATE",
      actionLabel: "Needs Human Help",
      strategyType: "Priority Support Ticket",
      autonomous: false,
      retryCount: 1,
      channel: "SUPPORT_DESK_ESCALATION",
      approvalRequired: true,
      policyRule: "HIGH_VALUE_THRESHOLD (> ₹50,000)",
    },
  },
  {
    id: "diff_03",
    title: "Non-Recoverable Stolen Card Safety Block",
    categoryLabel: "Cannot Be Recovered",
    amountFormatted: "₹18,500",
    triggerReason:
      "Permanent card block / fraud report detected in gateway code. Execution strictly terminated.",
    before: {
      origin: "AI Recommendation Engine",
      actionLabel: "Customer Reminder",
      strategyType: "Email Follow-up",
      autonomous: true,
      retryCount: 1,
      channel: "CUSTOMER_EMAIL_SMS",
      approvalRequired: false,
    },
    after: {
      origin: "Policy Guardrail Engine",
      decision: "BLOCK",
      actionLabel: "No Action (Safely Stopped)",
      strategyType: "Execution Terminated",
      autonomous: false,
      retryCount: 1,
      channel: "NONE",
      approvalRequired: false,
      policyRule: "NON_RECOVERABLE_GUARD (Permanent failure)",
    },
  },
];

export function PaymentChangeDetection() {
  const [selectedDiffId, setSelectedDiffId] = useState<string>("diff_01");
  const currentDiff = SAMPLE_DIFFS.find((d) => d.id === selectedDiffId) ?? SAMPLE_DIFFS[0];

  return (
    <Card className="rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 shadow-xl backdrop-blur-sm">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="font-mono text-xl font-bold tracking-tight text-white">
                Payment Change Detection
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Visual inspection of AI proposals versus safety-policy modifications
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-cyan-500/30 bg-cyan-500/10 font-mono text-[11px] text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
          >
            159 Safe Adjustments Detected
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6 pt-0">
        {/* Selector Pills */}
        <div className="flex flex-wrap gap-2 border-b border-[#1c2438] pb-4">
          {SAMPLE_DIFFS.map((diff) => {
            const isSelected = diff.id === selectedDiffId;
            return (
              <button
                key={diff.id}
                onClick={() => setSelectedDiffId(diff.id)}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 font-mono text-xs font-semibold transition-all duration-150 ${
                  isSelected
                    ? "border border-cyan-500/50 bg-[#121c2e] text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : "border border-[#1c2438] bg-[#090d16] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span>{diff.title}</span>
                <span className="rounded-md border border-cyan-500/20 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400">
                  {diff.amountFormatted}
                </span>
              </button>
            );
          })}
        </div>

        {/* Diff Reason Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-200">Why this was changed: </span>
            <span className="text-amber-300/90">{currentDiff.triggerReason}</span>
          </div>
        </div>

        {/* Side-by-Side Comparison Container */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* BEFORE: AI Proposal */}
          <div className="rounded-xl border border-[#1c2438] bg-[#090d16] p-4.5">
            <div className="mb-3 flex items-center justify-between border-b border-[#1c2438] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-800 font-mono text-[11px] font-bold text-slate-300">
                  A
                </span>
                <span className="font-mono text-xs font-bold tracking-wider text-slate-400 uppercase">
                  BEFORE (AI Recommendation)
                </span>
              </div>
              <Badge
                variant="secondary"
                className="border border-slate-700 bg-slate-800 text-[10px] text-slate-300"
              >
                {currentDiff.before.origin}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Proposed Action:</span>
                <span className="font-mono font-bold text-slate-200">
                  {currentDiff.before.actionLabel}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Execution Strategy:</span>
                <span className="font-medium text-slate-300">
                  {currentDiff.before.strategyType}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Dispatch Channel:</span>
                <span className="font-mono text-slate-300">{currentDiff.before.channel}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Autonomous Execution:</span>
                <span className="font-semibold text-amber-400">
                  {currentDiff.before.autonomous ? "Enabled (Direct)" : "Disabled"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Human Approval:</span>
                <span className="text-slate-300">
                  {currentDiff.before.approvalRequired ? "Mandatory" : "Not Requested"}
                </span>
              </div>
            </div>
          </div>

          {/* AFTER: Policy Decision (With Visual Diff Highlighting) */}
          <div className="relative rounded-xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-[#0a121e] to-[#0c1019] p-4.5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <div className="mb-3 flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 font-mono text-[11px] font-bold text-white shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                  B
                </span>
                <span className="font-mono text-xs font-bold tracking-wider text-emerald-400 uppercase">
                  AFTER (Policy Safe Action)
                </span>
              </div>
              <Badge className="border border-emerald-500/40 bg-emerald-500/20 font-mono text-[10px] font-bold text-emerald-300">
                {currentDiff.after.decision}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Highlighted Row: Action */}
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 font-medium text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Safe Action:</span>
                </span>
                <span className="flex items-center gap-1.5 font-mono font-bold text-emerald-300">
                  {currentDiff.after.actionLabel}
                  <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                    {currentDiff.after.decision === "BLOCK"
                      ? "BLOCKED"
                      : currentDiff.after.decision === "ESCALATE"
                        ? "ESCALATED"
                        : "CHANGED"}
                  </span>
                </span>
              </div>

              {/* Highlighted Row: Strategy */}
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-950/30 px-2.5 py-1 text-emerald-200">
                <span>Execution Strategy:</span>
                <span className="font-medium text-emerald-300">
                  {currentDiff.after.strategyType}
                </span>
              </div>

              {/* Channel */}
              <div className="flex items-center justify-between px-2.5 py-1">
                <span className="text-slate-400">Dispatch Channel:</span>
                <span className="font-mono font-medium text-slate-200">
                  {currentDiff.after.channel}
                </span>
              </div>

              {/* Autonomous */}
              <div className="flex items-center justify-between px-2.5 py-1">
                <span className="text-slate-400">Autonomous Execution:</span>
                <span className="font-semibold text-slate-200">
                  {currentDiff.after.autonomous ? "Permitted" : "Prevented (Human Required)"}
                </span>
              </div>

              {/* Rule Enforced */}
              <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-950/30 px-2.5 py-1 text-amber-200">
                <span className="font-medium text-amber-300">Rule Enforced:</span>
                <span className="font-mono text-[11px] font-semibold text-amber-200">
                  {currentDiff.after.policyRule}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interface Extensibility Notice */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1c2438] bg-[#090d16] px-4 py-2.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Interface ready to ingest live checkout DOM & payment payload diff streams.</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            Source: Policy Safety Audit Records
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
