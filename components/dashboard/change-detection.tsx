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
    <Card className="border-slate-200 shadow-sm dark:border-slate-800">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <GitCompare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Payment Change Detection
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Visual inspection of AI proposals versus safety-policy modifications
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-indigo-200 bg-indigo-50/50 font-mono text-[11px] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"
          >
            159 Safe Adjustments Detected
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Selector Pills */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          {SAMPLE_DIFFS.map((diff) => {
            const isSelected = diff.id === selectedDiffId;
            return (
              <button
                key={diff.id}
                onClick={() => setSelectedDiffId(diff.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                <span>{diff.title}</span>
                <span className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/20">
                  {diff.amountFormatted}
                </span>
              </button>
            );
          })}
        </div>

        {/* Diff Reason Banner */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5">
            <span className="font-semibold">Why this was changed: </span>
            <span>{currentDiff.triggerReason}</span>
          </div>
        </div>

        {/* Side-by-Side Comparison Container */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* BEFORE: AI Proposal */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  A
                </span>
                <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  Before (AI Recommendation)
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {currentDiff.before.origin}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Proposed Action:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {currentDiff.before.actionLabel}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Execution Strategy:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {currentDiff.before.strategyType}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Dispatch Channel:</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {currentDiff.before.channel}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Autonomous Execution:</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {currentDiff.before.autonomous ? "Enabled (Direct)" : "Disabled"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Human Approval:</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {currentDiff.before.approvalRequired ? "Mandatory" : "Not Requested"}
                </span>
              </div>
            </div>
          </div>

          {/* AFTER: Policy Decision (With Visual Diff Highlighting) */}
          <div className="relative rounded-xl border-2 border-emerald-500/40 bg-emerald-50/10 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/10">
            <div className="mb-3 flex items-center justify-between border-b border-emerald-200/40 pb-2.5 dark:border-emerald-900/30">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                  B
                </span>
                <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                  After (Policy Adjusted Safe Action)
                </span>
              </div>
              <Badge className="bg-emerald-600 text-[10px] text-white hover:bg-emerald-700">
                {currentDiff.after.decision}
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Highlighted Row: Action */}
              <div className="flex items-center justify-between rounded-md bg-emerald-100/60 px-2 py-1.5 font-medium text-emerald-900 ring-1 ring-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Safe Action:</span>
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {currentDiff.after.actionLabel}
                  <span className="ml-1.5 rounded bg-emerald-600 px-1 py-0.5 text-[9px] text-white">
                    CHANGED
                  </span>
                </span>
              </div>

              {/* Highlighted Row: Strategy */}
              <div className="flex items-center justify-between rounded-md bg-emerald-100/40 px-2 py-1 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                <span>Execution Strategy:</span>
                <span className="font-medium">{currentDiff.after.strategyType}</span>
              </div>

              {/* Channel */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-slate-500 dark:text-slate-400">Dispatch Channel:</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {currentDiff.after.channel}
                </span>
              </div>

              {/* Autonomous */}
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-slate-500 dark:text-slate-400">Autonomous Execution:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentDiff.after.autonomous ? "Permitted" : "Prevented (Human Required)"}
                </span>
              </div>

              {/* Rule Enforced */}
              <div className="flex items-center justify-between rounded-md bg-amber-50 px-2 py-1 text-amber-900 ring-1 ring-amber-300/40 dark:bg-amber-950/30 dark:text-amber-300">
                <span className="font-medium">Rule Enforced:</span>
                <span className="font-mono text-[11px] font-semibold">
                  {currentDiff.after.policyRule}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interface Extensibility Notice */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
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
