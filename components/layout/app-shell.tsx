import React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="tech-grid-bg relative flex min-h-screen bg-[#07090e] text-slate-100">
      {/* Ambient glow in background */}
      <div className="ambient-glow-top pointer-events-none fixed inset-0 z-0" />

      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Layout Container */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
