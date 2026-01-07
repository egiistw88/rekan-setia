import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export default function PageShell({
  title,
  description,
  children,
}: PageShellProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-24 pt-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Rekan Setia
        </p>
        <h1 className="text-2xl font-semibold text-[color:var(--foreground)]">
          {title}
        </h1>
        <p className="text-base text-[color:var(--muted)]">{description}</p>
      </header>
      {children}
    </main>
  );
}
