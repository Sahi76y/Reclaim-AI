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
    color: "text-cyan-400",
    badgeColor: "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30",
  },
  DYNAMIC_PAYMENT_LINK: {
    humanLabel: "Payment Link",
    description: "1-click recovery link for customer drop-offs and expired 3DS challenges.",
    icon: LinkIcon,
    color: "text-emerald-400",
    badgeColor: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
  },
  CUSTOMER_DUNNING: {
    humanLabel: "Customer Reminder",
    description: "Automated friendly reminder for balance top-ups & subscription renewals.",
    icon: Bell,
    color: "text-amber-400",
    badgeColor: "bg-amber-500/10 text-amber-300 border border-amber-500/30",
  },
  ESCALATE_HUMAN: {
    humanLabel: "Human Help",
    description: "Routed to customer support for high-value VIP checkouts & retry limits.",
    icon: Users,
    color: "text-purple-400",
    badgeColor: "bg-purple-500/10 text-purple-300 border border-purple-500/30",
  },
  NONE: {
    humanLabel: "No Action",
    description: "Permanently declined or lost cards skipped to prevent merchant friction.",
    icon: Ban,
    color: "text-rose-400",
    badgeColor: "bg-rose-500/10 text-rose-300 border border-rose-500/30",
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
    <Card className="rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 shadow-xl backdrop-blur-sm">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Execution Routing
              </span>
            </div>
            <CardTitle className="mt-1 font-mono text-xl font-bold tracking-tight text-white">
              Recovery Action Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 sm:text-sm">
              How different recovery strategies performed across the 1,000 cases
            </CardDescription>
          </div>
          <span className="self-start rounded-lg border border-[#1c2438] bg-[#090d16] px-3 py-1 font-mono text-xs font-semibold text-slate-300 sm:self-auto">
            5 Strategy Types
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1c2438] font-mono text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <th className="py-3 pr-4">Action</th>
                <th className="py-3 pr-4">Cases</th>
                <th className="py-3 pr-4">Amount Involved</th>
                <th className="py-3 pr-4">Recovered Amount</th>
                <th className="py-3 text-right">Recovery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2438]/50">
              {actions.map((act) => {
                const item = breakdown[act];
                const config = STRATEGY_CONFIG[act];
                const Icon = config.icon;

                return (
                  <tr key={act} className="transition-colors hover:bg-[#0f1524]">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.badgeColor}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-semibold text-white">{config.humanLabel}</span>
                          <span
                            title={`Technical: ${act}`}
                            className="ml-1.5 font-mono text-[10px] text-slate-500"
                          >
                            ({act})
                          </span>
                          <p className="hidden text-[11px] text-slate-400 sm:block">
                            {config.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 pr-4 font-mono font-bold text-slate-200">
                      {item.caseCount.toLocaleString("en-IN")}
                    </td>

                    <td className="py-3.5 pr-4 font-mono text-slate-400">
                      {formatFullINR(item.amountAtRiskINR)}
                    </td>

                    <td className="py-3.5 pr-4 font-mono font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                      {formatFullINR(item.recoveredAmountINR)}
                    </td>

                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[#131b2e] sm:block">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                            style={{ width: `${Math.min(item.recoveryRate, 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-white">
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
