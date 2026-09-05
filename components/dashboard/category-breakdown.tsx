import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock, CreditCard, UserCheck, RefreshCw, ShoppingCart, XCircle } from "lucide-react";
import type { RiskCategoryBreakdownItem, RiskCategoryType } from "@/server/evaluation/types";

interface CategoryBreakdownProps {
  breakdown: Record<RiskCategoryType, RiskCategoryBreakdownItem>;
}

const CATEGORY_MAP: Record<
  RiskCategoryType,
  {
    humanLabel: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }
> = {
  TEMPORARY_PAYMENT_FAILURE: {
    humanLabel: "Temporary Payment Problem",
    description: "Network timeouts, acquiring bank latency spikes, NPCI switch drops.",
    icon: Clock,
    accentColor: "bg-blue-500",
  },
  INSUFFICIENT_FUNDS: {
    humanLabel: "Not Enough Balance",
    description: "Account balance low or daily transaction limit reached at bank.",
    icon: CreditCard,
    accentColor: "bg-emerald-500",
  },
  CUSTOMER_ACTION_REQUIRED: {
    humanLabel: "Customer Needs to Act",
    description: "Expired SMS OTP, 3DS authentication modal timeout, UPI collect expired.",
    icon: UserCheck,
    accentColor: "bg-indigo-500",
  },
  REPEATED_PAYMENT_FAILURE: {
    humanLabel: "Repeated Payment Failure",
    description: "Multiple failed attempts with chronic issuer decline signals.",
    icon: RefreshCw,
    accentColor: "bg-amber-500",
  },
  ABANDONED_CHECKOUT: {
    humanLabel: "Checkout Abandoned",
    description: "Buyer navigated away before completing card/UPI authorization.",
    icon: ShoppingCart,
    accentColor: "bg-purple-500",
  },
  NON_RECOVERABLE: {
    humanLabel: "Cannot Be Recovered",
    description: "Stolen card, cancelled account, or permanent regulatory freeze.",
    icon: XCircle,
    accentColor: "bg-rose-500",
  },
};

export function CategoryBreakdown({ breakdown }: CategoryBreakdownProps) {
  const formatFullINR = (inr: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(inr);

  const categories: RiskCategoryType[] = [
    "TEMPORARY_PAYMENT_FAILURE",
    "INSUFFICIENT_FUNDS",
    "CUSTOMER_ACTION_REQUIRED",
    "REPEATED_PAYMENT_FAILURE",
    "ABANDONED_CHECKOUT",
    "NON_RECOVERABLE",
  ];

  return (
    <Card className="border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <CardHeader className="p-6 pb-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Payment Problem Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              How ReclaimAI classified the 1,000 payment problems
            </CardDescription>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            6 Problem Categories
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const item = breakdown[cat];
            const meta = CATEGORY_MAP[cat];
            const Icon = meta.icon;

            return (
              <div
                key={cat}
                className="dark:hover:bg-slate-850 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-slate-200">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {meta.humanLabel}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {item.caseCount} cases
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {meta.description}
                  </p>
                </div>

                <div className="mt-4 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Money at Risk:</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      {formatFullINR(item.amountAtRiskINR)}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Recovered:
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatFullINR(item.recoveredAmountINR)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Rate:</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${meta.accentColor}`}
                          style={{ width: `${Math.min(item.recoveryRate, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {item.recoveryRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
