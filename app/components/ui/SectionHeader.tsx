type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export default function SectionHeader({
  title,
  subtitle,
  className,
}: SectionHeaderProps) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        {title}
      </p>
      {subtitle ? (
        <p className="text-sm text-[color:var(--muted)]">{subtitle}</p>
      ) : null}
    </div>
  );
}
