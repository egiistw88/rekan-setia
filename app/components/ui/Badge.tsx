import type { Level } from "@/lib/engine";

type BadgeProps = {
  level: Level;
  className?: string;
};

const toneClass = (level: Level) => {
  if (level === "KRITIS") {
    return "bg-[color:var(--danger)]/15 text-[color:var(--danger)]";
  }
  if (level === "RAWAN") {
    return "bg-[color:var(--warn)]/15 text-[color:var(--warn)]";
  }
  return "bg-[color:var(--ok)]/15 text-[color:var(--ok)]";
};

export default function Badge({ level, className }: BadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${toneClass(
        level,
      )} ${className ?? ""}`}
    >
      {level}
    </span>
  );
}
