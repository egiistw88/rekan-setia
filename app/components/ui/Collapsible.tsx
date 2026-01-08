import type { ReactNode } from "react";
import Card from "@/app/components/ui/Card";

type CollapsibleProps = {
  title: string;
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export default function Collapsible({
  title,
  summary,
  open,
  onToggle,
  children,
}: CollapsibleProps) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {title}
          </p>
          {summary ? <div className="text-sm">{summary}</div> : null}
        </div>
        <span
          className={`mt-1 text-xs text-[color:var(--muted)] transition ${
            open ? "rotate-180" : ""
          }`}
        >
          v
        </span>
      </button>
      {open ? (
        <div className="mt-4 border-t border-[color:var(--border)] pt-4">
          {children}
        </div>
      ) : null}
    </Card>
  );
}
