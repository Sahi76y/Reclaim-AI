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
          <Badge
            variant="success"
            className="gap-1 border border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] font-semibold text-emerald-300"
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Successful</span>
          </Badge>
        );
      case "PENDING":
        return (
          <Badge
            variant="secondary"
            className="gap-1 border border-cyan-500/30 bg-cyan-500/10 font-mono text-[10px] font-semibold text-cyan-300"
          >
            <Clock className="h-3 w-3" />
            <span>Link Dispatched</span>
          </Badge>
        );
      case "ESCALATED":
        return (
          <Badge
            variant="warning"
            className="gap-1 border border-amber-500/30 bg-amber-500/10 font-mono text-[10px] font-semibold text-amber-300"
          >
            <UserCheck className="h-3 w-3" />
            <span>Needs Human Help</span>
          </Badge>
        );
      case "BLOCKED":
        return (
          <Badge
            variant="outline"
            className="gap-1 border border-rose-500/30 bg-rose-500/10 font-mono text-[10px] font-semibold text-rose-300"
          >
            <ShieldAlert className="h-3 w-3" />
            <span>Safely Skipped</span>
          </Badge>
        );
    }
  };

  return (
    <Card className="rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 shadow-xl backdrop-blur-sm">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="font-mono text-xl font-bold tracking-tight text-white">
                Recent Recovery Activity
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Recovery activity from the test-mode simulation
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="border border-amber-500/30 bg-amber-500/10 font-mono text-[11px] text-amber-300"
            >
              Simulation Mode
            </Badge>
            <span className="font-mono text-[11px] text-slate-400">No real money moved</span>
          </div>
        </div>

        {/* Filters and search */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-[#1c2438] pt-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search payment or problem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-[#1c2438] bg-[#090d16] py-1.5 pr-3 pl-8 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["ALL", "SUCCESSFUL", "PENDING", "ESCALATED", "BLOCKED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold transition-all duration-150 ${
                  filterStatus === st
                    ? "bg-white text-slate-950 shadow-xs"
                    : "border border-[#1c2438] bg-[#090d16] text-slate-400 hover:border-slate-700 hover:text-slate-200"
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
              <tr className="border-y border-[#1c2438] bg-[#090d16]/80 font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <th className="py-2.5 pr-3 pl-6">Payment</th>
                <th className="px-3 py-2.5">Problem Detected</th>
                <th className="px-3 py-2.5">Action Taken</th>
                <th className="px-3 py-2.5 text-right">Amount</th>
                <th className="px-3 py-2.5">Outcome</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="py-2.5 pr-6 pl-3 text-right">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2438]/40">
              {filtered.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-[#0f1524]">
                  <td className="py-3 pr-3 pl-6">
                    <div className="font-mono font-bold text-slate-200">{item.paymentId}</div>
                    <div className="font-mono text-[10px] text-slate-500">{item.timeAgo}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-slate-300">{item.problem}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 rounded-md border border-[#1c2438] bg-[#111726] px-2 py-0.5 font-mono text-xs font-medium text-slate-300">
                      {item.actionTaken}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-white">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-slate-300">{item.result}</span>
                  </td>
                  <td className="px-3 py-3">{getStatusBadge(item.status)}</td>
                  <td className="py-3 pr-6 pl-3 text-right">
                    <span className="inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-300 shadow-xs">
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
