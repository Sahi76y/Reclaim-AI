import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RefreshCw, Link as LinkIcon, Bell, Users, Ban } from "lucide-react";
import type { StrategyBreakdownItem, RecoveryActionType } from "@/server/evaluation/types";

interface StrategyBreakdownProps {
  breakdown: Record<RecoveryActionType, StrategyBreakdownItem>;
}

const STRATEGY_CONFIG: Record<
  RecoveryActionType,
  {
    humanLabel: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badgeColor: string;
  }
> = {
  SMART_RETRY: {
    humanLabel: "Smart Retry",
    description: "Scheduled exponential retry for network or issuer switch timeouts.",
    icon: RefreshCw,
    color: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  },
  DYNAMIC_PAYMENT_LINK: {
    humanLabel: "Payment Link",
    description: "1-click recovery link for customer drop-offs and expired 3DS challenges.",
    icon: LinkIcon,
    color: "text-emerald-600 dark:text-emerald-400",
    badgeColor:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  },
  CUSTOMER_DUNNING: {
    humanLabel: "Customer Reminder",
    description: "Automated friendly reminder for balance top-ups & subscription renewals.",
    icon: Bell,
    color: "text-amber-600 dark:text-amber-400",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  },
  ESCALATE_HUMAN: {
    humanLabel: "Human Help",
    description: "Routed to customer support for high-value VIP checkouts & retry limits.",
    icon: Users,
    color: "text-purple-600 dark:text-purple-400",
    badgeColor:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
  },
  NONE: {
    humanLabel: "No Action",
    description: "Permanently declined or lost cards skipped to prevent merchant friction.",
    icon: Ban,
    color: "text-rose-600 dark:text-rose-400",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300",
  },
};

export function StrategyBreakdown({ breakdown }: StrategyBreakdownProps) {
  const formatFullINR = (inr: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(inr);

  const actions: RecoveryActionType[] = [
    "SMART_RETRY",
    "DYNAMIC_PAYMENT_LINK",
    "CUSTOMER_DUNNING",
    "ESCALATE_HUMAN",
    "NONE",
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Recovery Action Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              How different recovery strategies performed across the 1,000 cases
            </CardDescription>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            5 Strategy Types
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-semibold text-slate-500 uppercase dark:border-slate-800 dark:text-slate-400">
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Cases</th>
                <th className="py-3 pr-4">Amount Involved</th>
                <th className="py-3 pr-4">Recovered Amount</th>
                <th className="py-3 text-right">Recovery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {actions.map((act) => {
                const item = breakdown[act];
                const config = STRATEGY_CONFIG[act];
                const Icon = config.icon;

                return (
                  <tr
                    key={act}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${config.badgeColor}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {config.humanLabel}
                          </span>
                          <span
                            title={`Technical: ${act}`}
                            className="ml-1.5 font-mono text-[10px] text-slate-400"
                          >
                            ({act})
                          </span>
                          <p className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
                            {config.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {item.caseCount.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3.5 pr-4 font-mono text-slate-600 dark:text-slate-400">
                      {formatFullINR(item.amountAtRiskINR)}
                    </td>

                    <td className="py-3.5 pr-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatFullINR(item.recoveredAmountINR)}
                    </td>

                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 sm:block dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(item.recoveryRate, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.recoveryRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
