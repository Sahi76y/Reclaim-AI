import React from "react";

export function RecentRecoveryTable() {
  // Deterministic rows matching Slide 4 with verified simulation cases
  const rows = [
    {
      time: "10:24 AM",
      paymentId: "pay_Nax7...9K2",
      action: "Payment Link",
      status: "Recovered",
      statusColor: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]",
      statusText: "text-emerald-400",
      amount: "₹1,250",
    },
    {
      time: "09:18 AM",
      paymentId: "pay_Nbx4...7P1",
      action: "Smart Retry",
      status: "Recovered",
      statusColor: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]",
      statusText: "text-emerald-400",
      amount: "₹3,499",
    },
    {
      time: "08:56 AM",
      paymentId: "pay_Nc9z...4L8",
      action: "Customer Reminder",
      status: "Pending",
      statusColor: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]",
      statusText: "text-amber-400",
      amount: "₹2,199",
    },
    {
      time: "08:11 AM",
      paymentId: "pay_Nd2m...1Q5",
      action: "No Action",
      status: "Blocked",
      statusColor: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]",
      statusText: "text-rose-400",
      amount: "₹899",
    },
    {
      time: "07:43 AM",
      paymentId: "pay_Ne8v...6R3",
      action: "Human Help",
      status: "In Progress",
      statusColor: "bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.8)]",
      statusText: "text-cyan-400",
      amount: "₹4,599",
    },
  ];

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-[#1c2438] bg-[#0c1019]/90 p-5 shadow-2xl backdrop-blur-sm">
      {/* Header matching Slide 4 */}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-base font-black tracking-tight text-white sm:text-lg">
          Recent Recovery Actions
        </h2>
        <a
          href="#razorpay-actions"
          className="font-mono text-xs font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
        >
          View All →
        </a>
      </div>

      {/* Table matching Slide 4 */}
      <div className="my-auto overflow-x-auto py-2">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-[#1c2438] font-mono text-[9px] font-bold tracking-wider text-slate-500 uppercase">
              <th className="pb-2">TIME</th>
              <th className="pb-2">PAYMENT ID</th>
              <th className="pb-2">ACTION</th>
              <th className="pb-2">STATUS</th>
              <th className="pb-2 text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c2438]/50">
            {rows.map((row) => (
              <tr key={row.paymentId} className="transition-colors hover:bg-[#0f1524]">
                <td className="py-2.5 font-mono text-slate-400">{row.time}</td>
                <td className="py-2.5 font-mono font-medium text-slate-300">{row.paymentId}</td>
                <td className="py-2.5 font-medium text-white">{row.action}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${row.statusColor}`} />
                    <span className={`font-mono text-[10px] font-semibold ${row.statusText}`}>
                      {row.status}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 text-right font-mono font-bold text-white">{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer simulation notice */}
      <div className="flex items-center justify-between border-t border-[#1c2438]/80 pt-3 text-[10px] text-slate-400">
        <span>Test simulation activity</span>
        <span className="font-mono text-amber-400">No real money moved</span>
      </div>
    </div>
  );
}
