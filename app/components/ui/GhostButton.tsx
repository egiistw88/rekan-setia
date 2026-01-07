import type { ButtonHTMLAttributes } from "react";

export const GHOST_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] px-4 py-3 text-sm font-semibold text-[color:var(--text)] transition hover:border-[color:var(--accent)]";

type GhostButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function GhostButton({ className, ...rest }: GhostButtonProps) {
  return (
    <button {...rest} className={`${GHOST_BUTTON_CLASS} ${className ?? ""}`} />
  );
}
