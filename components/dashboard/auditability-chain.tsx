"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck2, CheckCircle2, ArrowRight, Lock } from "lucide-react";

interface AuditCaseStep {
  title: string;
  stageName: string;
  badge: string;
  desc: string;
  details: Record<string, string>;
}

interface AuditCase {
  id: string;
  label: string;
  paymentId: string;
  amount: string;
  summary: string;
  steps: [AuditCaseStep, AuditCaseStep, AuditCaseStep, AuditCaseStep, AuditCaseStep];
}

const SAMPLE_AUDIT_CHAINS: AuditCase[] = [
  {
    id: "case_01",
    label: "Safe Automated Recovery",
    paymentId: "pay_syn_000001",
    amount: "₹2,499",
    summary: "Temporary bank network failure safely recovered via smart retry at optimal window.",
    steps: [
      {
        stageName: "01. Payment Problem",
        title: "Temporary Network Blip",
        badge: "Ingested",
        desc: "Bank gateway timed out during UPI checkout. Attempt #1.",
        details: {
          "Failure Reason": "BANK_GATEWAY_TIMEOUT",
          "Risk Category": "Temporary Payment Problem",
          "Amount at Risk": "₹2,499",
          "Attempt Count": "1 of 3",
        },
      },
      {
        stageName: "02. AI Recommendation",
        title: "Smart Retry Suggested",
        badge: "AI Formulated",
        desc: "AI diagnosed transient gateway degradation; suggested retry after 15m delay.",
        details: {
          "Suggested Action": "SMART_RETRY",
          "AI Confidence": "94.2%",
          "Recommended Delay": "15 minutes",
          "Execution Authority": "Zero (Advisory Only)",
        },
      },
      {
        stageName: "03. Safety Decision",
        title: "Policy Authorized",
        badge: "ALLOW",
        desc: "All 5 safety guardrails passed: attempt limit safe, amount under threshold.",
        details: {
          Decision: "ALLOW",
          "Retry Guard": "PASSED (1 < 3 max)",
          "Value Guard": "PASSED (< ₹50,000)",
          "Confidence Gate": "PASSED (94.2% >= 70%)",
        },
      },
      {
        stageName: "04. Recovery Action",
        title: "Razorpay Test Execution",
        badge: "Test Mode",
        desc: "Smart retry dispatched to Razorpay simulation API with unique idempotency key.",
        details: {
          "Action Executed": "SMART_RETRY",
          "Provider Mode": "RAZORPAY_TEST_SIMULATION",
          "Idempotency Key": "idemp_test_1_1788560298441",
          "Real Money Moved": "False (₹0 actual)",
        },
      },
      {
        stageName: "05. Audit & Result",
        title: "₹2,499 Recovered",
        badge: "Success",
        desc: "Simulated payment captured. Full cryptographic audit record sealed.",
        details: {
          Outcome: "RECOVERED_FULL",
          "Recovered Amount": "₹2,499",
          "Audit Hash": "sha256:7f8e3...9b21",
          "Immutable Log": "Verified",
        },
      },
    ],
  },
  {
    id: "case_02",
    label: "Safety Rule Adjustment",
    paymentId: "pay_syn_000007",
    amount: "₹6,800",
    summary: "AI suggested retrying, but policy guard intervened to send a payment link instead.",
    steps: [
      {
        stageName: "01. Payment Problem",
        title: "Repeated Failure",
        badge: "Ingested",
        desc: "Customer payment failed twice consecutively on debit card.",
        details: {
          "Failure Reason": "TRANSACTION_NOT_PERMITTED",
          "Risk Category": "Repeated Payment Failure",
          "Amount at Risk": "₹6,800",
          "Attempt Count": "3 of 3",
        },
      },
      {
        stageName: "02. AI Recommendation",
        title: "AI Suggested Another Retry",
        badge: "AI Formulated",
        desc: "AI suggested a third retry attempt with low confidence.",
        details: {
          "Suggested Action": "SMART_RETRY",
          "AI Confidence": "72.1%",
          "Recommended Delay": "30 minutes",
          "Execution Authority": "Zero (Advisory Only)",
        },
      },
      {
        stageName: "03. Safety Decision",
        title: "Policy Guard Intervened",
        badge: "MODIFY",
        desc: "RETRY_LIMIT_GUARD blocked direct retry to protect merchant score; modified to Payment Link.",
        details: {
          Decision: "MODIFY",
          "Rule Triggered": "RETRY_LIMIT_GUARD",
          "Safe Override Action": "DYNAMIC_PAYMENT_LINK",
          "Direct Retry": "BLOCKED",
        },
      },
      {
        stageName: "04. Recovery Action",
        title: "Payment Link Dispatched",
        badge: "Test Mode",
        desc: "Created 48-hour payment link in Razorpay test mode; sent via simulated SMS/WhatsApp.",
        details: {
          "Action Executed": "DYNAMIC_PAYMENT_LINK",
          "Link URL": "https://rzp.io/i/test_plink_89a",
          "Customer Notification": "Delivered",
          "Real Money Moved": "False (₹0 actual)",
        },
      },
      {
        stageName: "05. Audit & Result",
        title: "Customer Completed Payment",
        badge: "Recovered",
        desc: "Customer chose UPI on new link and completed payment. Full audit trace sealed.",
        details: {
          Outcome: "RECOVERED_FULL",
          "Recovered Amount": "₹6,800",
          "Audit Hash": "sha256:1a4c9...8e04",
          "Trace Sealed": "Verified",
        },
      },
    ],
  },
  {
    id: "case_03",
    label: "Permanent Failure Blocked",
    paymentId: "pay_syn_000015",
    amount: "₹14,200",
    summary: "Invalid expired card was permanently failed; policy completely stopped recovery.",
    steps: [
      {
        stageName: "01. Payment Problem",
        title: "Invalid Card Credential",
        badge: "Ingested",
        desc: "Card expired or permanently canceled by issuing bank.",
        details: {
          "Failure Reason": "CARD_EXPIRED_OR_CANCELED",
          "Risk Category": "Cannot Be Recovered",
          "Amount at Risk": "₹14,200",
          "Attempt Count": "1 of 1",
        },
      },
      {
        stageName: "02. AI Recommendation",
        title: "AI Diagnosed Non-Recoverable",
        badge: "AI Formulated",
        desc: "AI accurately flagged permanent unrecoverable failure taxonomy.",
        details: {
          "Suggested Action": "NONE",
          "AI Confidence": "98.5%",
          "Recoverable Flag": "False",
          "Execution Authority": "Zero (Advisory Only)",
        },
      },
      {
        stageName: "03. Safety Decision",
        title: "Strict Safety Block",
        badge: "BLOCK",
        desc: "NON_RECOVERABLE_GUARD executed; completely forbade automated or retry actions.",
        details: {
          Decision: "BLOCK",
          "Rule Triggered": "NON_RECOVERABLE_GUARD",
          "Recovery Allowed": "False",
          "Customer Harassment": "Prevented",
        },
      },
      {
        stageName: "04. Recovery Action",
        title: "Execution Terminated",
        badge: "Safely Skipped",
        desc: "Zero calls made to payment gateway; no customer outreach dispatched.",
        details: {
          "Action Executed": "NONE (Skipped)",
          "Gateway Calls": "0 (None)",
          "Unsafe Action Stopped": "True",
          "Real Money Moved": "False (₹0 actual)",
        },
      },
      {
        stageName: "05. Audit & Result",
        title: "Safely Closed & Logged",
        badge: "Protected",
        desc: "Prevented futile fee burn and saved merchant reputation.",
        details: {
          Outcome: "PERMANENT_FAILURE_SKIPPED",
          "Futile Fees Saved": "₹28.40 estimated",
          "Audit Hash": "sha256:d83e1...22fa",
          "Integrity Check": "Verified",
        },
      },
    ],
  },
];

export function AuditabilityChain() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("case_01");
  const currentCase =
    SAMPLE_AUDIT_CHAINS.find((c) => c.id === selectedCaseId) ?? SAMPLE_AUDIT_CHAINS[0];

  return (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Every Decision is Traceable
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                End-to-end cryptographic audit trail from payment failure to verified resolution
              </CardDescription>
            </div>
          </div>

          <Badge
            variant="outline"
            className="gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-300"
          >
            <Lock className="h-3 w-3 text-emerald-600" />
            <span>Immutable Tamper-Evident Trail</span>
          </Badge>
        </div>

        {/* Core Philosophy Banner */}
        <div className="mt-3 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/50 p-4 dark:border-blue-900/40 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-bold tracking-wider text-blue-700 uppercase dark:text-blue-400">
                Architectural Invariant
              </p>
              <h3 className="text-base font-bold text-slate-900 sm:text-lg dark:text-slate-100">
                &ldquo;AI recommends. Policy authorizes. Executor acts.&rdquo;
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                The AI advisor possesses zero direct payment execution authority. Only deterministic
                policy rules authorize actions, executed exclusively in Razorpay test mode.
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-2 font-mono text-xs font-medium shadow-xs dark:bg-slate-900/80">
              <span className="text-blue-600">AI</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="text-emerald-600">Policy</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="text-amber-600">Razorpay Test</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Sample Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500">Inspect Sample Audit Trace:</span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_AUDIT_CHAINS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedCaseId(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  item.id === selectedCaseId
                    ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {item.label} ({item.amount})
              </button>
            ))}
          </div>
        </div>

        {/* Selected Case Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
              {currentCase.paymentId}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-600 dark:text-slate-400">{currentCase.summary}</span>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px]">
            Amount: {currentCase.amount}
          </Badge>
        </div>

        {/* 5-Step Connected Flow Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {currentCase.steps.map((step, idx) => (
            <div
              key={step.stageName}
              className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Header */}
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {step.stageName}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {step.badge}
                </span>
              </div>

              {/* Title & Description */}
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {step.title}
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {step.desc}
              </p>

              {/* Details table */}
              <div className="mt-3 border-t border-slate-100 pt-2 text-[10px] dark:border-slate-800">
                <dl className="space-y-1">
                  {Object.entries(step.details).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <dt className="text-slate-400">{k}:</dt>
                      <dd className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Step indicator footer */}
              <div className="mt-auto pt-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Step {idx + 1} of 5</span>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
