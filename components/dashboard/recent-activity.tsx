"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, Clock, UserCheck, ShieldAlert, Search } from "lucide-react";
import type { CaseEvaluationRecord } from "@/server/evaluation/types";

interface RecoveryActivityItem {
  id: string;
  paymentId: string;
  problem: string;
  actionTaken: string;
  amount: number;
  result: string;
  status: "SUCCESSFUL" | "PENDING" | "ESCALATED" | "BLOCKED";
  timeAgo: string;
  isTestMode: boolean;
}

const DEFAULT_ACTIVITIES: RecoveryActivityItem[] = [
  {
    id: "act_01",
    paymentId: "pay_syn_000001",
    problem: "Temporary Payment Problem",
    actionTaken: "Smart Retry",
    amount: 2499,
    result: "₹2,499 Recovered",
    status: "SUCCESSFUL",
    timeAgo: "Simulation case",
    isTestMode: true,
  },
  {
    id: "act_02",
    paymentId: "pay_syn_000004",
    problem: "Customer Needs to Act",
    actionTaken: "Payment Link",
    amount: 5400,
    result: "Link Delivered (WhatsApp)",
    status: "PENDING",
    timeAgo: "Simulation case",
    isTestMode: true,
  },
  {
    id: "act_03",
    paymentId: "pay_syn_000012",
    problem: "High-Value Payment Problem",
    actionTaken: "Human Help",
    amount: 75000,
    result: "Escalated to VIP Desk",
    status: "ESCALATED",
    timeAgo: "Simulation case",
    isTestMode: true,
  },
  {
    id: "act_04",
    paymentId: "pay_syn_000019",
    problem: "Not Enough Balance",
    actionTaken: "Customer Reminder",
    amount: 1850,
    result: "Scheduled for Payday",
    status: "PENDING",
    timeAgo: "Simulation case",
    isTestMode: true,
  },
  {
    id: "act_05",
    paymentId: "pay_syn_000028",
    problem: "Cannot Be Recovered",
    actionTaken: "No Action",
    amount: 3200,
    result: "Safely Skipped",
    status: "BLOCKED",
    timeAgo: "Simulation case",
    isTestMode: true,
  },
  {
    id: "act_06",
    paymentId: "pay_syn_000045",
    problem: "Temporary Payment Problem",
    actionTaken: "Smart Retry",
    amount: 12900,
    result: "₹12,900 Recovered",
    status: "SUCCESSFUL",
    timeAgo: "Simulation case",
    isTestMode: true,
  },
  {
    id: "act_07",
    paymentId: "pay_syn_000078",
    problem: "Repeated Payment Failure",
    actionTaken: "Payment Link",
    amount: 8750,
    result: "UPI Intent Link Sent",
    status: "PENDING",
    timeAgo: "Simulation case",
    isTestMode: true,
  },
  {
    id: "act_08",
    paymentId: "pay_syn_000092",
    problem: "Cannot Be Recovered",
    actionTaken: "No Action",
    amount: 6100,
    result: "Safely Skipped",
    status: "BLOCKED",
    timeAgo: "Simulation case",
    isTestMode: true,
  },
];

const PROBLEM_MAP: Record<string, string> = {
  TEMPORARY_PAYMENT_FAILURE: "Payment failed temporarily",
  INSUFFICIENT_FUNDS: "Not enough account balance",
  CUSTOMER_ACTION_REQUIRED: "Customer needs to approve",
  REPEATED_PAYMENT_FAILURE: "Multiple retry failures",
  ABANDONED_CHECKOUT: "Customer left checkout early",
  NON_RECOVERABLE: "Payment cannot be recovered",
};

const ACTION_MAP: Record<string, string> = {
  SMART_RETRY: "Smart Retry",
  DYNAMIC_PAYMENT_LINK: "Payment Link",
  CUSTOMER_DUNNING: "Customer Reminder",
  ESCALATE_HUMAN: "Human Help",
  NONE: "No Action",
};

interface RecentActivityProps {
  cases?: CaseEvaluationRecord[];
}

export function RecentRecoveryActivity({ cases }: RecentActivityProps) {
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Map case evaluation records if provided, else use realistic simulated activities
  const activities: RecoveryActivityItem[] = React.useMemo(() => {
    if (cases && cases.length > 0) {
      return cases.slice(0, 15).map((c, i) => {
        let status: RecoveryActivityItem["status"] = "PENDING";
        let resultText = "In Progress";

        if (c.evaluationFlags.recovered) {
          status = "SUCCESSFUL";
          resultText = `₹${c.recoveryExecution.recoveredAmountINR.toLocaleString("en-IN")} Recovered`;
        } else if (c.policyDecision.approvedAction === "ESCALATE_HUMAN") {
          status = "ESCALATED";
          resultText = "Escalated to Agent";
        } else if (
          c.policyDecision.approvedAction === "NONE" ||
          c.policyDecision.decision === "BLOCK"
        ) {
          status = "BLOCKED";
          resultText = "Safely Skipped";
        } else {
          resultText = "Link / Reminder Sent";
        }

        return {
          id: `case_${c.eventId}_${i}`,
          paymentId: c.eventId,
          problem: PROBLEM_MAP[c.category] ?? c.category,
          actionTaken:
            ACTION_MAP[c.policyDecision.approvedAction] ?? c.policyDecision.approvedAction,
          amount: c.amountAtRiskINR,
          result: resultText,
          status,
          timeAgo: "Simulation case",
          isTestMode: true,
        };
      });
    }
    return DEFAULT_ACTIVITIES;
  }, [cases]);

  const filtered = activities.filter((act) => {
    const matchesStatus = filterStatus === "ALL" || act.status === filterStatus;
    const matchesSearch =
      act.paymentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.problem.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.actionTaken.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: RecoveryActivityItem["status"]) => {
    switch (status) {
      case "SUCCESSFUL":
        return (
          <Badge variant="success" className="gap-1 font-sans text-[11px] font-medium">
            <CheckCircle2 className="h-3 w-3" />
            <span>Successful</span>
          </Badge>
        );
      case "PENDING":
        return (
          <Badge
            variant="secondary"
            className="gap-1 font-sans text-[11px] font-medium text-blue-700 dark:text-blue-300"
          >
            <Clock className="h-3 w-3" />
            <span>Link Dispatched</span>
          </Badge>
        );
      case "ESCALATED":
        return (
          <Badge variant="warning" className="gap-1 font-sans text-[11px] font-medium">
            <UserCheck className="h-3 w-3" />
            <span>Needs Human Help</span>
          </Badge>
        );
      case "BLOCKED":
        return (
          <Badge
            variant="outline"
            className="gap-1 font-sans text-[11px] font-medium text-slate-500"
          >
            <ShieldAlert className="h-3 w-3" />
            <span>Safely Skipped</span>
          </Badge>
        );
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Recent Recovery Activity
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Recovery activity from the test-mode simulation
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="font-mono text-[11px] text-amber-700 dark:text-amber-300"
            >
              Simulation Mode
            </Badge>
            <span className="text-[11px] text-slate-400">No real money moved</span>
          </div>
        </div>

        {/* Filters and search */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 pt-2">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search payment or problem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white py-1.5 pr-3 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["ALL", "SUCCESSFUL", "PENDING", "ESCALATED", "BLOCKED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filterStatus === st
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {st === "ALL" ? "All Activity" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/60 font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <th className="py-2.5 pr-3 pl-6">Payment</th>
                <th className="px-3 py-2.5">Problem Detected</th>
                <th className="px-3 py-2.5">Action Taken</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Outcome</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="py-2.5 pr-6 pl-3 text-right">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 pr-3 pl-6">
                    <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
                      {item.paymentId}
                    </div>
                    <div className="text-[10px] text-slate-400">{item.timeAgo}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {item.problem}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {item.actionTaken}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.result}
                    </span>
                  </td>
                  <td className="px-3 py-3">{getStatusBadge(item.status)}</td>
                  <td className="py-3 pr-6 pl-3 text-right">
                    <span className="inline-block rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                      TEST SIMULATION
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
