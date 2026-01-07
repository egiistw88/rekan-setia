"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/db";
import type { DailyAssessment, Level } from "@/lib/engine";
import { getAssessmentForToday } from "@/lib/engine";
import {
  getTodayDateKey,
  upsertCareerLogPatch,
  upsertDailyLogPatch,
} from "@/lib/logs";
import NudgeCenter from "@/app/components/NudgeCenter";
import BottomSheet from "@/app/components/ui/BottomSheet";
import Card from "@/app/components/ui/Card";
import GhostButton, { GHOST_BUTTON_CLASS } from "@/app/components/ui/GhostButton";
import { PRIMARY_BUTTON_CLASS } from "@/app/components/ui/PrimaryButton";
import SectionHeader from "@/app/components/ui/SectionHeader";

const OVERALL_COPY: Record<Level, string> = {
  AMAN: "Hari ini saya cukup stabil.",
  RAWAN: "Hari ini saya rawan. Saya rapikan yang penting dulu.",
  KRITIS: "Hari ini saya kritis. Saya selamat dulu.",
};

const levelTone = (level: Level) => {
  if (level === "KRITIS") {
    return "bg-[color:var(--danger)]/15 text-[color:var(--danger)]";
  }
  if (level === "RAWAN") {
    return "bg-[color:var(--warn)]/15 text-[color:var(--warn)]";
  }
  return "bg-[color:var(--ok)]/15 text-[color:var(--ok)]";
};

const getReasonFallback = (level: Level) => {
  if (level === "KRITIS") {
    return "Saya butuh bertahan dulu, bukan menambah beban.";
  }
  if (level === "RAWAN") {
    return "Saya jaga ritme agar tidak melebar.";
  }
  return "Saya tetap di jalur yang cukup stabil.";
};

export default function Home() {
  const [assessment, setAssessment] = useState<DailyAssessment | null>(null);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const toastTimeout = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const isDebug = searchParams.get("debug") === "1";
  const dateKey = useMemo(() => getTodayDateKey(), []);
  const dailyLog = useLiveQuery(() => db.dailyLogs.get(dateKey), [dateKey]);
  const careerLog = useLiveQuery(() => db.careerLogs.get(dateKey), [dateKey]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast("");
    }, 2000);
  };

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

  const refreshAssessment = async () => {
    try {
      const result = await getAssessmentForToday();
      setAssessment(result);
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleSubuh = async () => {
    const nextValue = !(dailyLog?.subuhDone ?? false);
    try {
      await upsertDailyLogPatch(dateKey, { subuhDone: nextValue });
      showToast(nextValue ? "Saya pegang Subuh." : "Saya ulang lagi besok.");
      void refreshAssessment();
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa memperbarui Subuh.");
    }
  };

  const handleChatIncrement = async () => {
    const current = careerLog?.clientChatsSent ?? 0;
    if (current >= 3) {
      showToast("Chat klien hari ini sudah 3.");
      return;
    }
    const nextValue = Math.min(3, current + 1);
    try {
      await upsertCareerLogPatch(dateKey, { clientChatsSent: nextValue });
      showToast("Saya bergerak: 1 chat.");
      void refreshAssessment();
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menambah chat.");
    }
  };

  const handleBreathIncrement = async () => {
    const current = dailyLog?.breathSessions ?? 0;
    if (current >= 10) {
      showToast("Napas sadar sudah 10.");
      return;
    }
    const nextValue = Math.min(10, current + 1);
    try {
      await upsertDailyLogPatch(dateKey, { breathSessions: nextValue });
      showToast("Saya tambah 1 sesi napas.");
      void refreshAssessment();
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menambah napas.");
    }
  };

  const handlePlanToggle = async (item: string, checked: boolean) => {
    try {
      await upsertDailyLogPatch(dateKey, { planChecks: { [item]: checked } });
      void refreshAssessment();
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan checklist.");
    }
  };

  const primaryAction = useMemo(() => {
    if (assessment?.overallLevel === "KRITIS") {
      return { href: "/drop", label: "Mulai Drop Mode" };
    }
    return { href: "/input", label: "Isi Input Malam" };
  }, [assessment?.overallLevel]);

  return (
    <>
      <main className="flex w-full flex-1 flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold leading-tight text-[color:var(--text)]">
            Saya tidak perlu kuat hari ini. Saya perlu stabil.
          </h1>
          <p className="text-base text-[color:var(--muted)]">
            Ini ruang tenang untuk menata langkah kecil hari ini.
          </p>
        </header>

        {toast ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)]"
          >
            {toast}
          </div>
        ) : null}

        {isAssessmentLoading ? (
          <Card>
            <p className="text-sm text-[color:var(--muted)]">
              Saya sedang merapikan peta hari ini...
            </p>
          </Card>
        ) : assessment ? (
          <>
            <Card>
              <SectionHeader title="Status Hari Ini" />
              <div className="mt-3 flex items-start justify-between gap-4">
                <p className="text-lg font-semibold text-[color:var(--text)]">
                  {OVERALL_COPY[assessment.overallLevel]}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${levelTone(
                    assessment.overallLevel,
                  )}`}
                >
                  {assessment.overallLevel}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-base text-[color:var(--muted)]">
                {assessment.overallReasons.length > 0 ? (
                  assessment.overallReasons.map((reason, index) => (
                    <li key={`${index}-${reason}`}>- {reason}</li>
                  ))
                ) : (
                  <li>- {getReasonFallback(assessment.overallLevel)}</li>
                )}
              </ul>
            </Card>

            <Card>
              <SectionHeader title="Plan Besok" />
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--text)]">
                {assessment.planTomorrow.map((item, index) => (
                  <li key={`${index}-${item}`} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[color:var(--accent)]"
                      checked={Boolean(dailyLog?.planChecks?.[item])}
                      onChange={(event) =>
                        handlePlanToggle(item, event.target.checked)
                      }
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-[color:var(--muted)]">
                Checklist ini untuk saya pegang, bukan untuk menghakimi.
              </p>
            </Card>

            <div className="grid gap-2">
              <Link
                href={primaryAction.href}
                className={`${PRIMARY_BUTTON_CLASS} w-full`}
              >
                {primaryAction.label}
              </Link>
              <GhostButton
                type="button"
                onClick={() => setIsSheetOpen(true)}
                className="w-full"
              >
                Aksi cepat
              </GhostButton>
            </div>

            {isDebug ? (
              <Card>
                <SectionHeader title="Debug Engine" />
                <div className="mt-3 space-y-3 text-xs text-[color:var(--muted)]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      dateKeyToday
                    </p>
                    <p className="font-mono text-[color:var(--text)]">
                      {assessment.debug?.dateKeyToday ?? assessment.dateKey}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Primary Driver
                    </p>
                    <p className="font-mono text-[color:var(--text)]">
                      {assessment.primaryDriver}
                      {assessment.debug?.primaryDriverConfidence !== undefined
                        ? ` (${assessment.debug.primaryDriverConfidence})`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Bottleneck Domain
                    </p>
                    <p className="font-mono text-[color:var(--text)]">
                      {assessment.debug?.bottleneckDomain ??
                        assessment.primaryDriver}
                      {assessment.debug?.bottleneckConfidence !== undefined ||
                      assessment.debug?.primaryDriverConfidence !== undefined
                        ? ` (${
                            assessment.debug?.bottleneckConfidence ??
                            assessment.debug?.primaryDriverConfidence
                          })`
                        : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Mode Tomorrow
                    </p>
                    <p className="font-mono text-[color:var(--text)]">
                      {assessment.modeTomorrow}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Last7 dateKeys
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] p-3 font-mono text-[10px] text-[color:var(--text)]">
                      {(assessment.debug?.last7Keys ?? []).join(", ") || "-"}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Counts
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] p-3 font-mono text-[10px] text-[color:var(--text)]">
                      {JSON.stringify(assessment.debug?.counts ?? {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Driver Scores
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] p-3 font-mono text-[10px] text-[color:var(--text)]">
                      {JSON.stringify(
                        assessment.debug?.driverScores ?? {},
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Daily Log
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] p-3 font-mono text-[10px] text-[color:var(--text)]">
                      {JSON.stringify(
                        assessment.debug?.dailyLog ?? null,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Finance Log
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] p-3 font-mono text-[10px] text-[color:var(--text)]">
                      {JSON.stringify(
                        assessment.debug?.financeLog ?? null,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Relation Log
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] p-3 font-mono text-[10px] text-[color:var(--text)]">
                      {JSON.stringify(
                        assessment.debug?.relationLog ?? null,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Career Log
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--surface2)] p-3 font-mono text-[10px] text-[color:var(--text)]">
                      {JSON.stringify(
                        assessment.debug?.careerLog ?? null,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </div>
              </Card>
            ) : null}
          </>
        ) : (
          <Card>
            <p className="text-sm text-[color:var(--muted)]">
              Saya belum punya peta hari ini, tapi saya tetap bisa mulai pelan.
            </p>
          </Card>
        )}
      </main>

      <BottomSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Aksi cepat"
      >
        <div className="space-y-4">
          <NudgeCenter />
          <div className="grid gap-2">
            <button
              type="button"
              onClick={handleToggleSubuh}
              className={`${GHOST_BUTTON_CLASS} w-full`}
            >
              Pegang Subuh
            </button>
            <Link
              href="/relation?start=1"
              className={`${GHOST_BUTTON_CLASS} w-full`}
            >
              Ritual 7 menit
            </Link>
            <button
              type="button"
              onClick={handleChatIncrement}
              className={`${GHOST_BUTTON_CLASS} w-full`}
            >
              Chat klien +1
            </button>
            <button
              type="button"
              onClick={handleBreathIncrement}
              className={`${GHOST_BUTTON_CLASS} w-full`}
            >
              Napas +1
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
