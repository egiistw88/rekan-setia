"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import Card from "@/app/components/ui/Card";
import EmptyState from "@/app/components/ui/EmptyState";
import Page from "@/app/components/ui/Page";
import { db } from "@/lib/db";
import type { DailyAssessment } from "@/lib/engine";
import { getAssessmentForToday } from "@/lib/engine";
import { getTodayDateKey } from "@/lib/logs";

type Highlight = {
  title: string;
  reason: string;
  href: string;
};

type Tile = {
  title: string;
  description: string;
  href: string;
  badge?: string;
  icon: string;
};

export default function MorePage() {
  const [assessment, setAssessment] = useState<DailyAssessment | null>(null);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(true);
  const dateKey = useMemo(() => getTodayDateKey(), []);
  const dailyLog = useLiveQuery(() => db.dailyLogs.get(dateKey), [dateKey]);

  useEffect(() => {
    let active = true;
    setIsAssessmentLoading(true);

    const load = async () => {
      try {
        const result = await getAssessmentForToday();
        if (active) {
          setAssessment(result);
        }
      } catch (error) {
        console.error(error);
        if (active) {
          setAssessment(null);
        }
      } finally {
        if (active) {
          setIsAssessmentLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const ritualDone = dailyLog?.ritualDone === true;
  const subuhDone = dailyLog?.subuhDone === true;
  const isCritical = assessment?.overallLevel === "KRITIS";

  const highlight = useMemo<Highlight | null>(() => {
    if (!assessment) {
      return null;
    }
    if (isCritical) {
      return {
        title: "Drop Mode",
        reason: "Saya turunkan gelombang dulu supaya sistem saya tenang.",
        href: "/drop",
      };
    }
    if (!ritualDone) {
      return {
        title: "Relasi",
        reason: "Saya hadir 7 menit supaya saya tidak menghilang.",
        href: "/relation?start=1",
      };
    }
    if (!subuhDone) {
      return {
        title: "Spiritual",
        reason: "Saya pegang Subuh pelan, tanpa menekan diri.",
        href: "/spiritual",
      };
    }
    return {
      title: "Settings",
      reason: "Saya rapikan target supaya ritme lebih ringan.",
      href: "/settings",
    };
  }, [assessment, isCritical, ritualDone, subuhDone]);

  const tiles: Tile[] = [
    {
      title: "Drop Mode",
      description: "Turunkan gelombang 60 detik",
      href: "/drop",
      badge: isCritical ? "disarankan" : undefined,
      icon: "DM",
    },
    {
      title: "Relasi",
      description: "Ritual hadir 7 menit",
      href: "/relation?start=1",
      badge: ritualDone ? undefined : "belum",
      icon: "R7",
    },
    {
      title: "Spiritual",
      description: "Pegangan minimal",
      href: "/spiritual",
      badge: subuhDone ? undefined : "belum",
      icon: "SP",
    },
    {
      title: "Settings",
      description: "Target & pengingat",
      href: "/settings",
      icon: "ST",
    },
  ];

  return (
    <Page
      title="Lainnya"
      subtitle="Saya pilih satu yang paling saya butuhkan."
    >
      {isAssessmentLoading && !assessment ? (
        <Card>
          <p className="text-sm text-[color:var(--muted)]">
            Saya sedang merapikan rekomendasi hari ini...
          </p>
        </Card>
      ) : highlight ? (
        <Link href={highlight.href} className="block">
          <Card className="space-y-3 transition hover:border-[color:var(--accent)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Yang paling penting sekarang
            </p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[color:var(--text)]">
                {highlight.title}
              </p>
              <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]">
                Buka
              </span>
            </div>
            <p className="text-xs text-[color:var(--muted)]">{highlight.reason}</p>
          </Card>
        </Link>
      ) : (
        <EmptyState
          title="Hari ini cukup tenang"
          body="Saya bisa pilih satu langkah kecil saja."
          primaryLabel="Buka Settings"
          primaryHref="/settings"
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Link key={tile.title} href={tile.href} className="block">
            <Card className="flex h-full flex-col gap-2 transition hover:border-[color:var(--accent)]">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] text-[11px] font-semibold text-[color:var(--text)]">
                  {tile.icon}
                </span>
                {tile.badge ? (
                  <span className="rounded-full bg-[color:var(--warn)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--warn)]">
                    {tile.badge}
                  </span>
                ) : null}
              </div>
              <div>
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  {tile.title}
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  {tile.description}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Page>
  );
}
