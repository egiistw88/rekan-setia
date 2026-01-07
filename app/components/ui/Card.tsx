import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  tone?: "surface" | "surface2";
};

const toneStyles: Record<NonNullable<CardProps["tone"]>, string> = {
  surface: "bg-[color:var(--surface)]",
  surface2: "bg-[color:var(--surface2)]",
};

export default function Card({
  children,
  className,
  tone = "surface",
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={`rounded-[var(--radius-lg)] border border-[color:var(--border)] p-4 shadow-[var(--shadow)] ${
        toneStyles[tone]
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
