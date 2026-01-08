import Link from "next/link";
import Card from "@/app/components/ui/Card";
import { GHOST_BUTTON_CLASS } from "@/app/components/ui/GhostButton";
import { PRIMARY_BUTTON_CLASS } from "@/app/components/ui/PrimaryButton";

type EmptyStateProps = {
  title: string;
  body: string;
  primaryLabel?: string;
  primaryHref?: string;
  primaryOnClick?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  secondaryOnClick?: () => void;
};

export default function EmptyState({
  title,
  body,
  primaryLabel,
  primaryHref,
  primaryOnClick,
  secondaryLabel,
  secondaryHref,
  secondaryOnClick,
}: EmptyStateProps) {
  return (
    <Card className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[color:var(--text)]">
          {title}
        </p>
        <p className="text-xs text-[color:var(--muted)]">{body}</p>
      </div>
      {primaryLabel && (primaryHref || primaryOnClick) ? (
        <div className="flex flex-wrap gap-2">
          {primaryOnClick ? (
            <button
              type="button"
              onClick={primaryOnClick}
              className={PRIMARY_BUTTON_CLASS}
            >
              {primaryLabel}
            </button>
          ) : primaryHref ? (
            <Link href={primaryHref} className={PRIMARY_BUTTON_CLASS}>
              {primaryLabel}
            </Link>
          ) : null}
          {secondaryLabel && (secondaryHref || secondaryOnClick) ? (
            secondaryOnClick ? (
              <button
                type="button"
                onClick={secondaryOnClick}
                className={GHOST_BUTTON_CLASS}
              >
                {secondaryLabel}
              </button>
            ) : secondaryHref ? (
              <Link href={secondaryHref} className={GHOST_BUTTON_CLASS}>
                {secondaryLabel}
              </Link>
            ) : null
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
