import type { ReactNode } from "react";
import { spacingScale, typeScale } from "@/app/styles/ui";

type PageProps = {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
  children: ReactNode;
  className?: string;
  withStickyCta?: boolean;
};

export default function Page({
  title,
  subtitle,
  rightAction,
  children,
  className,
  withStickyCta = false,
}: PageProps) {
  const paddingBottom = withStickyCta
    ? spacingScale.pagePaddingBottom
    : spacingScale.pagePaddingBottomRelaxed;

  return (
    <main
      className={`flex w-full flex-1 flex-col ${spacingScale.pageGap} ${paddingBottom} ${
        className ?? ""
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className={typeScale.pageTitle}>{title}</h1>
          {subtitle ? (
            <p className={typeScale.pageSubtitle}>{subtitle}</p>
          ) : null}
        </div>
        {rightAction ? <div>{rightAction}</div> : null}
      </header>
      {children}
    </main>
  );
}
