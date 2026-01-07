import type { ReactNode } from "react";
import BottomNav from "@/app/components/BottomNav";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[color:var(--bg)] text-[color:var(--text)]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pb-28 pt-6">
        <header className="flex items-center justify-between pb-4">
          <span className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--muted)]">
            Rekan Setia
          </span>
        </header>
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
