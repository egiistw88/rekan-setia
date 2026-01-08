"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import IconButton from "@/app/components/ui/IconButton";
import Badge from "@/app/components/ui/Badge";
import EmptyState from "@/app/components/ui/EmptyState";
import Page from "@/app/components/ui/Page";
import { PRIMARY_BUTTON_CLASS } from "@/app/components/ui/PrimaryButton";

const OVERALL_COPY: Record<Level, string> = {
  AMAN: "Hari ini saya cukup stabil.",
  RAWAN: "Hari ini saya rawan. Saya rapikan yang penting dulu.",
  KRITIS: "Hari ini saya kritis. Saya selamat dulu.",
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

function HomeContent() {
  const [assessment, setAssessment] = useState<DailyAssessment | null>(null);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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

  const primaryReason =
    assessment?.overallReasons?.[0] ??
    (assessment ? getReasonFallback(assessment.overallLevel) : "");
  const secondaryReason = assessment?.overallReasons?.[1];

  const planItems = assessment?.planTomorrow?.slice(0, 3) ?? [];

  return (
    <>
      <Page
        title="Rekan Setia"
        subtitle="Saya menutup hari pelan, tapi pasti."
        withStickyCta
      >
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
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Status Hari Ini
                  </p>
                  <Badge level={assessment.overallLevel} />
                </div>
                <IconButton
                  type="button"
                  onClick={() => setIsSheetOpen(true)}
                  aria-label="Aksi cepat"
                >
                  ...
                </IconButton>
              </div>
              <p className="mt-3 text-sm font-semibold text-[color:var(--text)]">
                {OVERALL_COPY[assessment.overallLevel]}
              </p>
              <ul className="mt-2 space-y-1 text-sm leading-snug text-[color:var(--muted)]">
                <li>- {primaryReason}</li>
                {showDetails && secondaryReason ? (
                  <li>- {secondaryReason}</li>
                ) : null}
              </ul>
              {secondaryReason ? (
                <button
                  type="button"
                  onClick={() => setShowDetails((prev) => !prev)}
                  className="mt-2 text-xs text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
                >
                  {showDetails ? "Tutup" : "Detail"}
                </button>
              ) : null}
            </Card>

            <Card>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Plan Besok
              </p>
              {planItems.length === 0 ? (
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  Saya cukup pegang satu hal kecil besok.
                </p>
              ) : (
                <ul className="mt-3 space-y-1 text-sm text-[color:var(--text)]">
                  {planItems.map((item, index) => (
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
              )}
              <p className="mt-3 text-xs text-[color:var(--muted)]">
                Checklist ini untuk saya pegang, bukan untuk menghakimi.
              </p>
            </Card>

            <NudgeCenter />

            {isDebug ? (
              <Card>
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Debug Engine
                </p>
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
          <EmptyState
            title="Saya mulai pelan"
            body="Belum ada peta hari ini. Saya bisa mulai dari input malam."
            primaryLabel="Isi Input Malam"
            primaryHref="/input"
          />
        )}
      </Page>

      <BottomSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Aksi cepat"
      >
        <div className="divide-y divide-[color:var(--border)] text-sm">
          <div className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-[color:var(--text)]">
                Pegang Subuh
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                Toggle status Subuh hari ini.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleSubuh}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
            >
              Toggle
            </button>
          </div>
          <div className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-[color:var(--text)]">Napas +1</p>
              <p className="text-xs text-[color:var(--muted)]">
                Tambah 1 sesi napas sadar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBreathIncrement}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
            >
              Tambah
            </button>
          </div>
          <div className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-[color:var(--text)]">
                Ritual 7 menit
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                Mulai ritual hadir untuk istri.
              </p>
            </div>
            <Link
              href="/relation?start=1"
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
            >
              Buka
            </Link>
          </div>
          <div className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-[color:var(--text)]">
                Chat klien +1
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                Tambah 1 chat untuk tracker hari ini.
              </p>
            </div>
            <button
              type="button"
              onClick={handleChatIncrement}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
            >
              Tambah
            </button>
          </div>
        </div>
      </BottomSheet>

      <div
        className="fixed inset-x-0 z-30 border-t border-[color:var(--border)] bg-[color:var(--surface2)]/95 backdrop-blur"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-[560px] px-5 py-3">
          <Link href={primaryAction.href} className={`${PRIMARY_BUTTON_CLASS} w-full`}>
            {primaryAction.label}
          </Link>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex w-full flex-1 items-center justify-center text-sm text-[color:var(--muted)]">
          Memuat...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
