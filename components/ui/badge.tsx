import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tracking-wide",
  {
    variants: {
      variant: {
        default: "border-slate-700/80 bg-slate-800 text-slate-100 shadow-xs",
        secondary: "border-slate-800 bg-slate-800/80 text-slate-300",
        outline: "text-slate-300 border-slate-700/80 bg-transparent",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-400 font-mono",
        danger: "border-rose-500/40 bg-rose-500/15 text-rose-300 font-mono",
        guardrail: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-mono",
        brand:
          "border-rose-500/40 bg-rose-500/10 text-rose-300 font-mono shadow-xs shadow-rose-950/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
