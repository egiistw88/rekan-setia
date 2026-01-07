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

const isNightWindow = (date: Date) => {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 21 * 60 || minutes < 3 * 60;
};

const OVERALL_COPY: Record<Level, string> = {
  AMAN: "Hari ini saya cukup stabil.",
  RAWAN: "Hari ini saya rawan. Saya rapikan yang penting dulu.",
  KRITIS: "Hari ini saya kritis. Saya selamat dulu.",
};

const levelTone = (level: Level) => {
  if (level === "KRITIS") {
    return "bg-rose-500/15 text-rose-600 dark:text-rose-300";
  }
  if (level === "RAWAN") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
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
  const [now, setNow] = useState(() => new Date());
  const [assessment, setAssessment] = useState<DailyAssessment | null>(null);
  const [isAssessmentLoading, setIsAssessmentLoading] = useState(true);
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);
  const searchParams = useSearchParams();
  const isDebug = searchParams.get("debug") === "1";
  const dateKey = useMemo(() => getTodayDateKey(), []);
  const dailyLog = useLiveQuery(() => db.dailyLogs.get(dateKey), [dateKey]);
  const careerLog = useLiveQuery(() => db.careerLogs.get(dateKey), [dateKey]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

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

  const isNight = useMemo(() => isNightWindow(now), [now]);

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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-24 pt-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Rekan Setia
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-[color:var(--foreground)]">
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
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--foreground)]"
        >
          {toast}
        </div>
      ) : null}

      <section className="space-y-4">
        {isAssessmentLoading ? (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--muted)]">
            Saya sedang merapikan peta hari ini...
          </div>
        ) : assessment ? (
          <>
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Status Hari Ini
                  </p>
                  <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                    {OVERALL_COPY[assessment.overallLevel]}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${levelTone(
                    assessment.overallLevel,
                  )}`}
                >
                  {assessment.overallLevel}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-[color:var(--muted)]">
                {assessment.overallReasons.length > 0 ? (
                  assessment.overallReasons.map((reason, index) => (
                    <li key={`${index}-${reason}`}>- {reason}</li>
                  ))
                ) : (
                  <li>- {getReasonFallback(assessment.overallLevel)}</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Plan Besok
              </p>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--foreground)]">
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
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Aksi Cepat
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/drop"
                  className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
                >
                  Drop Mode
                </Link>
                <Link
                  href="/input"
                  className={`rounded-full border px-3 py-2 text-xs transition ${
                    isNight
                      ? "border-transparent bg-[color:var(--accent)] text-white"
                      : "border-[color:var(--border)] text-[color:var(--foreground)]"
                  }`}
                >
                  Input Malam
                </Link>
                <button
                  type="button"
                  onClick={handleToggleSubuh}
                  className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
                >
                  Pegang Subuh
                </button>
                <Link
                  href="/relation?start=1"
                  className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
                >
                  Ritual 7 menit
                </Link>
                <button
                  type="button"
                  onClick={handleChatIncrement}
                  className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
                >
                  Chat Klien +1
                </button>
                <button
                  type="button"
                  onClick={handleBreathIncrement}
                  className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
                >
                  Napas +1
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Ringkasan Domain
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Stabilitas", data: assessment.stability },
                  { label: "Keuangan", data: assessment.finance },
                  { label: "Relasi", data: assessment.relations },
                  { label: "Spiritual", data: assessment.spiritual },
                  { label: "Karier", data: assessment.career },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        {item.label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelTone(
                          item.data.level,
                        )}`}
                      >
                        {item.data.level}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-semibold text-[color:var(--foreground)]">
                      {item.data.score}/100
                    </p>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">
                      {item.data.reasons[0] ?? getReasonFallback(item.data.level)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {isDebug ? (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Debug Engine
                </p>
                <div className="mt-3 space-y-3 text-xs text-[color:var(--muted)]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      dateKeyToday
                    </p>
                    <p className="font-mono text-[color:var(--foreground)]">
                      {assessment.debug?.dateKeyToday ?? assessment.dateKey}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Primary Driver
                    </p>
                    <p className="font-mono text-[color:var(--foreground)]">
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
                    <p className="font-mono text-[color:var(--foreground)]">
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
                    <p className="font-mono text-[color:var(--foreground)]">
                      {assessment.modeTomorrow}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Last7 dateKeys
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 font-mono text-[10px] text-[color:var(--foreground)]">
                      {(assessment.debug?.last7Keys ?? []).join(", ") || "-"}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Counts
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 font-mono text-[10px] text-[color:var(--foreground)]">
                      {JSON.stringify(assessment.debug?.counts ?? {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Driver Scores
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 font-mono text-[10px] text-[color:var(--foreground)]">
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
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 font-mono text-[10px] text-[color:var(--foreground)]">
                      {JSON.stringify(assessment.debug?.dailyLog ?? null, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                      Finance Log
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 font-mono text-[10px] text-[color:var(--foreground)]">
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
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 font-mono text-[10px] text-[color:var(--foreground)]">
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
                    <pre className="mt-2 overflow-x-auto rounded-xl border border-[color:var(--border)] bg-[color:var(--background)] p-3 font-mono text-[10px] text-[color:var(--foreground)]">
                      {JSON.stringify(
                        assessment.debug?.careerLog ?? null,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 text-sm text-[color:var(--muted)]">
            Saya belum punya peta hari ini, tapi saya tetap bisa mulai pelan.
          </div>
        )}
      </section>

      {isNight ? (
        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">
            Mode Malam - saya menutup hari dengan rapi
          </p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Pilih satu hal yang ingin saya catat sebelum tidur.
          </p>
        </section>
      ) : null}

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Aksi cepat
        </p>
        <Link
          href="/input"
          className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
            isNight
              ? "border-transparent bg-[color:var(--accent)] text-white shadow-lg ring-1 ring-white/30"
              : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)]"
          }`}
        >
          <span>{isNight ? "Input Malam" : "Mulai Input"}</span>
          <span className="text-xs opacity-80">Masuk</span>
        </Link>
        {isNight ? (
          <p className="text-xs text-[color:var(--muted)]">
            Saya tutup hari supaya besok tidak kacau.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/drop", label: "Drop" },
            { href: "/finance", label: "Keuangan" },
            { href: "/relation", label: "Relasi" },
            { href: "/input", label: "Input cepat" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--foreground)] transition hover:-translate-y-0.5 hover:border-[color:var(--accent)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Lainnya
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/spiritual"
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
          >
            Spiritual
          </Link>
          <Link
            href="/career"
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
          >
            Karier
          </Link>
          <Link
            href="/settings"
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-[color:var(--muted)] transition hover:text-[color:var(--foreground)]"
          >
            Pengaturan
          </Link>
        </div>
      </section>
    </main>
  );
}
