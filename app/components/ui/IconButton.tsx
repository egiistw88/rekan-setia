import type { ButtonHTMLAttributes } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconButton({ className, ...rest }: IconButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] text-xs text-[color:var(--text)] transition hover:border-[color:var(--accent)] ${className ?? ""}`}
    />
  );
}
