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
    <main className="flex w-full flex-1 flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-[color:var(--text)]">
          {title}
        </h1>
        <p className="text-base text-[color:var(--muted)]">{description}</p>
      </header>
      {children}
    </main>
  );
}
