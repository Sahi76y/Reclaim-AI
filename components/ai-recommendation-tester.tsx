"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  ShieldCheck,
  RefreshCw,
  Eye,
  UserCheck,
  ShieldAlert,
  XCircle,
  Shield,
  ArrowRight,
} from "lucide-react";
import type { RecoveryRecommendationOutput } from "@/server/ai/types";
import type { PolicyDecision } from "@/server/policy/types";
import type { RecoveryExecutionResult } from "@/server/recovery/types";

interface SamplePreset {
  id: string;
  label: string;
  category: string;
}

const SAMPLE_EVENTS: SamplePreset[] = [
  {
    id: "evt_syn_000001",
    label: "Transient Network Timeout (₹2,499 - Regular Customer)",
    category: "TEMPORARY_PAYMENT_FAILURE",
  },
  {
    id: "evt_syn_000002",
    label: "Insufficient Balance on VIP Card (₹8,999 - VIP Tier)",
    category: "INSUFFICIENT_FUNDS",
  },
  {
    id: "evt_syn_000003",
    label: "OTP Authentication Expired (₹1,299 - Subscription)",
    category: "CUSTOMER_ACTION_REQUIRED",
  },
  {
    id: "evt_syn_000004",
    label: "Exhausted 3x Retries (₹4,500 - Churn Risk)",
    category: "REPEATED_PAYMENT_FAILURE",
  },
  {
    id: "evt_syn_000005",
    label: "Customer Drop-off at OTP Page (₹3,200 - Regular)",
    category: "ABANDONED_CHECKOUT",
  },
  {
    id: "evt_syn_000006",
    label: "Lost/Stolen Card Blocked (₹15,000 - High Risk)",
    category: "NON_RECOVERABLE",
  },
];

export function AIRecommendationTester() {
  const [selectedEventId, setSelectedEventId] = useState<string>("evt_syn_000001");
  const [customEventId, setCustomEventId] = useState<string>("");
  const [provider, setProvider] = useState<"mock" | "openai">("mock");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEvaluatingPolicy, setIsEvaluatingPolicy] = useState<boolean>(false);
  const [recommendation, setRecommendation] = useState<RecoveryRecommendationOutput | null>(null);
  const [policyDecision, setPolicyDecision] = useState<PolicyDecision | null>(null);
  const [executionProvider, setExecutionProvider] = useState<"RAZORPAY_TEST" | "SIMULATOR">(
    "RAZORPAY_TEST"
  );
  const [isExecutingRecovery, setIsExecutingRecovery] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<RecoveryExecutionResult | null>(null);
  const [executionBlockedReason, setExecutionBlockedReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const activeEventId = customEventId.trim() || selectedEventId;

  const handleRequestRecommendation = async () => {
    setIsLoading(true);
    setError(null);
    setPolicyDecision(null);
    setExecutionResult(null);
    setExecutionBlockedReason(null);
    try {
      const response = await fetch("/api/recovery/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: activeEventId,
          provider,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `HTTP ${response.status}: Failed to generate recommendation`);
      }

      setRecommendation(json.data);

      // Automatically chain policy evaluation for seamless inspection
      await handleEvaluatePolicy(activeEventId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setRecommendation(null);
      setPolicyDecision(null);
      setExecutionResult(null);
      setExecutionBlockedReason(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteRecovery = async () => {
    if (!policyDecision) return;
    setIsExecutingRecovery(true);
    setError(null);
    setExecutionBlockedReason(null);
    try {
      const response = await fetch("/api/recovery/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: activeEventId,
          providerPreference: executionProvider,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `HTTP ${response.status}: Execution failed`);
      }

      if (json.executionBlocked) {
        setExecutionBlockedReason(json.guardReason || "Execution blocked by safety policy");
        setExecutionResult(json.result || null);
      } else {
        setExecutionResult(json.result);
        setExecutionBlockedReason(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Recovery execution error";
      setError(message);
    } finally {
      setIsExecutingRecovery(false);
    }
  };

  const handleEvaluatePolicy = async (targetEventId?: string) => {
    const eventIdToUse = targetEventId || activeEventId;
    setIsEvaluatingPolicy(true);
    try {
      const response = await fetch("/api/recovery/policy-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: eventIdToUse,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `HTTP ${response.status}: Policy evaluation failed`);
      }

      setPolicyDecision(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Policy evaluation error";
      setError(message);
    } finally {
      setIsEvaluatingPolicy(false);
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    const percent = Math.round(confidence * 100);
    if (confidence >= 0.8) {
      return (
        <Badge variant="success" className="font-mono text-xs">
          {percent}% (High)
        </Badge>
      );
    } else if (confidence >= 0.6) {
      return (
        <Badge variant="warning" className="font-mono text-xs">
          {percent}% (Moderate)
        </Badge>
      );
    } else {
      return (
        <Badge variant="danger" className="font-mono text-xs">
          {percent}% (Low)
        </Badge>
      );
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "SMART_RETRY":
        return "Smart Autonomous Retry";
      case "DYNAMIC_PAYMENT_LINK":
        return "Dynamic Payment Link";
      case "CUSTOMER_DUNNING":
        return "Gentle Customer Dunning";
      case "ESCALATE_HUMAN":
        return "Escalate to Human Agent";
      case "NONE":
        return "No Action (Halt)";
      default:
        return action;
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case "ALLOW":
        return (
          <Badge variant="success" className="gap-1 font-mono text-xs">
            <CheckCircle2 className="h-3 w-3" />
            <span>ALLOWED</span>
          </Badge>
        );
      case "MODIFY":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-blue-100 font-mono text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-200"
          >
            <Shield className="h-3 w-3" />
            <span>MODIFIED</span>
          </Badge>
        );
      case "ESCALATE":
        return (
          <Badge variant="warning" className="gap-1 font-mono text-xs">
            <AlertTriangle className="h-3 w-3" />
            <span>ESCALATED</span>
          </Badge>
        );
      case "BLOCK":
        return (
          <Badge variant="danger" className="gap-1 font-mono text-xs">
            <XCircle className="h-3 w-3" />
            <span>BLOCKED</span>
          </Badge>
        );
      default:
        return <Badge variant="outline">{decision}</Badge>;
    }
  };

  return (
    <Card className="border-indigo-100 bg-gradient-to-b from-indigo-50/20 to-white shadow-xs dark:border-indigo-900/50 dark:from-indigo-950/10 dark:to-slate-900">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white shadow-xs">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Step 3 & 4 — AI Diagnosis & Policy Guardrail Inspector
              </CardTitle>
              <CardDescription className="text-xs">
                Interactive console testing AI recovery recommendations and deterministic policy
                authorization
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-[11px] text-indigo-700 dark:text-indigo-300"
            >
              Deterministic Safety Authority
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6 pt-0">
        {/* Event Selection & Provider Controls */}
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Select a Synthetic Risk Event to Diagnose & Check Guardrails:
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {SAMPLE_EVENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedEventId(item.id);
                  setCustomEventId("");
                }}
                className={`rounded border p-2.5 text-left transition-all ${
                  selectedEventId === item.id && !customEventId
                    ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500/40 dark:bg-indigo-950/40"
                    : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                }`}
              >
                <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                  {item.id}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  {item.label}
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="min-w-[200px] flex-1">
              <input
                type="text"
                placeholder="Or enter custom event ID (e.g. evt_syn_000042)"
                value={customEventId}
                onChange={(e) => setCustomEventId(e.target.value)}
                className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Engine:
              </span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as "mock" | "openai")}
                className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="mock">Deterministic Mock AI (Multi-Signal)</option>
                <option value="openai">OpenAI (GPT-4o Structured)</option>
              </select>

              <Button
                onClick={handleRequestRecommendation}
                disabled={isLoading || !activeEventId}
                size="sm"
                className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {isLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>{isLoading ? "Analyzing..." : "Diagnose & Evaluate Policy"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div>
              <span className="font-semibold">Execution Notice: </span>
              {error}
            </div>
          </div>
        )}

        {/* Structured AI Recommendation Results */}
        {recommendation && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500">Event ID:</span>
                <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {recommendation.eventId}
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {recommendation.provider} / {recommendation.model}
                </Badge>
              </div>

              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{showRawJson ? "Hide Raw Schema" : "Inspect Raw JSON"}</span>
              </button>
            </div>

            {/* Main Human-Readable Cards Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Question 1: Why did this payment fail? */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    Why did this payment fail?
                  </span>
                  <Badge
                    variant={
                      recommendation.diagnosis.severity === "CRITICAL"
                        ? "danger"
                        : recommendation.diagnosis.severity === "HIGH"
                          ? "warning"
                          : "outline"
                    }
                    className="font-mono text-[10px]"
                  >
                    Severity: {recommendation.diagnosis.severity}
                  </Badge>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {recommendation.diagnosis.summary}
                </p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Likely Root Cause:{" "}
                  </span>
                  {recommendation.diagnosis.likelyCause}
                </p>
              </div>

              {/* Question 2: Recommended next step */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                    AI Suggested Action
                  </span>
                  {getConfidenceBadge(recommendation.recommendation.confidence)}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant="default"
                    className="bg-indigo-600 text-xs font-semibold hover:bg-indigo-700"
                  >
                    {getActionLabel(recommendation.recommendation.action)}
                  </Badge>
                  <span className="font-mono text-xs text-slate-400">
                    ({recommendation.recommendation.action})
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Rationale:{" "}
                  </span>
                  {recommendation.recommendation.reason}
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                  <span className="font-medium">Expected Benefit: </span>
                  {recommendation.recommendation.expectedBenefit}
                </p>
              </div>
            </div>

            {/* Step 4 Safety Check / Policy Guardrail Section */}
            {isEvaluatingPolicy && (
              <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 text-xs text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Evaluating deterministic policy guardrails...</span>
              </div>
            )}

            {policyDecision && (
              <div className="space-y-4 rounded-lg border-2 border-indigo-200 bg-indigo-50/20 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5 dark:border-indigo-900/40">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold tracking-wider text-indigo-950 uppercase dark:text-indigo-200">
                      Step 4: Policy & Safety Guardrail Check
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Safety Decision:</span>
                    {getDecisionBadge(policyDecision.decision)}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Left: Action Comparison */}
                  <div className="rounded border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs text-slate-500">AI Recommendation:</div>
                    <div className="mt-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {policyDecision.originalAction} (
                      {getActionLabel(policyDecision.originalAction)})
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                      <span>Approved Next Step:</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        variant={
                          policyDecision.approvedAction === "NONE"
                            ? "danger"
                            : policyDecision.approvedAction === "ESCALATE_HUMAN"
                              ? "warning"
                              : "success"
                        }
                        className="text-xs font-semibold"
                      >
                        {getActionLabel(policyDecision.approvedAction)}
                      </Badge>
                      <span className="font-mono text-xs text-slate-400">
                        ({policyDecision.approvedAction})
                      </span>
                    </div>

                    <div className="mt-3 text-[11px] text-slate-500">
                      Policy Version:{" "}
                      <span className="font-mono">{policyDecision.policyVersion}</span>
                    </div>
                  </div>

                  {/* Right: Plain-Language Reasons */}
                  <div className="rounded border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Why (Policy Reasons):
                    </div>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {policyDecision.reasons.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Rules Checked Checklist */}
                <div className="rounded border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Rules Checked:
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {policyDecision.ruleResults.map((rule) => (
                      <div
                        key={rule.ruleId}
                        className={`rounded border p-2 text-xs transition-colors ${
                          rule.passed
                            ? "border-emerald-200 bg-emerald-50/40 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300"
                            : "border-amber-200 bg-amber-50/60 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-medium">
                          {rule.passed ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          )}
                          <span>{rule.ruleName}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] opacity-80">{rule.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Safety & Operational Flags */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3.5 dark:border-slate-800 dark:bg-slate-900/20">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-slate-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Active Guardrail Status:
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Needs human review:</span>
                    {(policyDecision?.requiresHumanReview ??
                    recommendation.safety.requiresHumanReview) ? (
                      <Badge variant="warning" className="gap-1 text-[11px]">
                        <UserCheck className="h-3 w-3" />
                        <span>Yes</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-[11px] text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>No</span>
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Customer action required:</span>
                    <Badge variant="outline" className="text-[11px]">
                      {(policyDecision?.requiresCustomerAction ??
                      recommendation.safety.requiresCustomerAction)
                        ? "Yes"
                        : "No"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Autonomous execution halted:</span>
                    <Badge
                      variant={
                        (policyDecision?.shouldStopAutomation ??
                        recommendation.safety.shouldStopAutomation)
                          ? "danger"
                          : "outline"
                      }
                      className="text-[11px]"
                    >
                      {(policyDecision?.shouldStopAutomation ??
                      recommendation.safety.shouldStopAutomation)
                        ? "Yes (Halted)"
                        : "No"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Controlled Recovery Execution Engine */}
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 p-4 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/20 dark:via-slate-900/60 dark:to-purple-950/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3 dark:border-indigo-900/40">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-indigo-600 p-1.5 text-white shadow-sm">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                      Step 5: Recovery Execution Engine
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Executes strictly the policy-approved action in Test Mode
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-500/30 ring-inset dark:bg-amber-950 dark:text-amber-200">
                    RAZORPAY TEST MODE
                  </span>

                  <select
                    value={executionProvider}
                    onChange={(e) =>
                      setExecutionProvider(e.target.value as "RAZORPAY_TEST" | "SIMULATOR")
                    }
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="RAZORPAY_TEST">Razorpay Test Mode</option>
                    <option value="SIMULATOR">Simulator (Deterministic)</option>
                  </select>

                  <Button
                    onClick={handleExecuteRecovery}
                    disabled={!policyDecision || isExecutingRecovery}
                    size="sm"
                    className="gap-1.5 bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isExecutingRecovery ? "animate-spin" : ""}`}
                    />
                    <span>{isExecutingRecovery ? "Executing..." : "Execute Approved Action"}</span>
                  </Button>
                </div>
              </div>

              {/* Execution Blocked by Policy Alert */}
              {executionBlockedReason && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Execution blocked by safety policy.</span>
                  </div>
                  <p className="mt-1 pl-6 text-amber-800 dark:text-amber-300">
                    {executionBlockedReason}
                  </p>
                </div>
              )}

              {/* Execution Result Display */}
              {executionResult && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {/* Approved Action */}
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Approved Action
                      </span>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {getActionLabel(executionResult.action)}
                      </div>
                    </div>

                    {/* Execution Status */}
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Execution Status
                      </span>
                      <div className="mt-1">
                        {executionResult.status === "SUCCESS" && (
                          <Badge variant="success" className="gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>SUCCESS</span>
                          </Badge>
                        )}
                        {executionResult.status === "FAILED" && (
                          <Badge variant="danger" className="gap-1 text-xs">
                            <XCircle className="h-3 w-3" />
                            <span>FAILED</span>
                          </Badge>
                        )}
                        {executionResult.status === "PENDING" && (
                          <Badge
                            variant="secondary"
                            className="gap-1 bg-blue-100 text-xs text-blue-900 dark:bg-blue-950 dark:text-blue-200"
                          >
                            <span>PENDING</span>
                          </Badge>
                        )}
                        {executionResult.status === "ESCALATED" && (
                          <Badge variant="warning" className="gap-1 text-xs">
                            <UserCheck className="h-3 w-3" />
                            <span>ESCALATED</span>
                          </Badge>
                        )}
                        {executionResult.status === "SKIPPED" && (
                          <Badge variant="outline" className="gap-1 text-xs text-slate-500">
                            <span>SKIPPED</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Provider */}
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Provider
                      </span>
                      <div className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                        {executionResult.provider === "RAZORPAY_TEST"
                          ? "Razorpay Test Mode"
                          : "Simulator"}
                      </div>
                    </div>

                    {/* Recovered Amount with Disclosure Context */}
                    <div className="rounded-lg border border-slate-200 bg-white/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Recovered Amount
                      </span>
                      <div className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{(executionResult.recoveredAmount / 100).toLocaleString("en-IN")}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {executionResult.provider === "RAZORPAY_TEST"
                          ? "Test-mode recovery result"
                          : "Simulated recovery result"}
                      </p>
                    </div>
                  </div>

                  {/* Operational References and Idempotency */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-100/70 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-500">Reference:</span>
                      <code className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {executionResult.providerReference || "N/A"}
                      </code>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-500">Idempotency:</span>
                      <Badge
                        variant="outline"
                        className="gap-1 border-emerald-300 text-[11px] text-emerald-700 dark:text-emerald-300"
                      >
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        <span>Protected</span>
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Raw JSON Accordion View */}
            {showRawJson && (
              <pre className="max-h-72 overflow-auto rounded bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
                {JSON.stringify({ recommendation, policyDecision }, null, 2)}
              </pre>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
