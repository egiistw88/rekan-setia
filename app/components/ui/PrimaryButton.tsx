import type { ButtonHTMLAttributes } from "react";

export const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function PrimaryButton({
  className,
  ...rest
}: PrimaryButtonProps) {
  return (
    <button
      {...rest}
      className={`${PRIMARY_BUTTON_CLASS} ${className ?? ""}`}
    />
  );
}
