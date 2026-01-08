"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@/app/components/ui/Card";
import EmptyState from "@/app/components/ui/EmptyState";
import GhostButton from "@/app/components/ui/GhostButton";
import Page from "@/app/components/ui/Page";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { db, type DeferredDecisionRecord } from "@/lib/db";
import { getTodayDateKey, upsertDailyLogPatch } from "@/lib/logs";
import { computeRemindAtWib, formatNowWib } from "@/lib/time";

const delayOptions: Array<{ value: "1h" | "3h" | "tomorrow"; label: string }> = [
  { value: "1h", label: "1 jam" },
  { value: "3h", label: "3 jam" },
  { value: "tomorrow", label: "Besok pagi" },
];

const formatTimer = (secondsLeft: number) => {
  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function DropPage() {
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [isDelayOpen, setIsDelayOpen] = useState(false);
  const [delayChoice, setDelayChoice] =
    useState<"1h" | "3h" | "tomorrow">("1h");
  const [delayTopic, setDelayTopic] = useState("");
  const [toast, setToast] = useState("");
  const [dropLogError, setDropLogError] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const toastTimeout = useRef<number | null>(null);

  const dateKey = useMemo(() => getTodayDateKey(), []);
  const dailyLog = useLiveQuery(() => db.dailyLogs.get(dateKey), [dateKey]);
  const deferredToday = useLiveQuery(
    () => db.deferredDecisions.where("dateKey").equals(dateKey).toArray(),
    [dateKey],
  );

  const deferredList = useMemo(() => {
    const list = [...(deferredToday ?? [])];
    list.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
    return list.slice(0, 3);
  }, [deferredToday]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const key = `drop_logged_${dateKey}`;
    try {
      if (window.sessionStorage.getItem(key)) {
        return;
      }
      window.sessionStorage.setItem(key, "1");
    } catch (error) {
      console.error(error);
      setDropLogError(true);
      return;
    }
    const logDrop = async () => {
      const existing = await db.dailyLogs.get(dateKey);
      const nextRuns = (existing?.dropModeRuns ?? 0) + 1;
      try {
        await upsertDailyLogPatch(dateKey, { dropModeRuns: nextRuns });
      } catch (error) {
        console.error(error);
        setDropLogError(true);
      }
    };
    void logDrop();
  }, [dateKey]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast("");
    }, 2000);
  };

  const handleStart = () => {
    if (secondsLeft === 0) {
      setSecondsLeft(60);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(60);
  };

  const handleAddBreath = async () => {
    const current = dailyLog?.breathSessions ?? 0;
    const next = Math.min(10, current + 1);
    try {
      await upsertDailyLogPatch(dateKey, { breathSessions: next });
      showToast("Saya menambah 1 sesi napas.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menambah napas.");
    }
  };

  const handleSaveDelay = async () => {
    const trimmedTopic = delayTopic.trim();
    if (!trimmedTopic) {
      showToast("Tulis keputusan yang saya tunda dulu.");
      return;
    }
    const now = new Date();
    const record: DeferredDecisionRecord = {
      id: createId(),
      dateKey,
      createdAtIso: now.toISOString(),
      createdAtWib: formatNowWib(),
      delayChoice,
      remindAtWib: computeRemindAtWib(delayChoice, now),
      topic: trimmedTopic,
      resolved: false,
    };
    try {
      await db.deferredDecisions.put(record);
      setDelayTopic("");
      setIsDelayOpen(false);
      showToast("Saya tunda dulu. Saya kembali saat lebih stabil.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan tunda.");
    }
  };

  const handleResolve = async (item: DeferredDecisionRecord) => {
    if (item.resolved) {
      return;
    }
    try {
      await db.deferredDecisions.update(item.id, {
        resolved: true,
        resolvedAtWib: formatNowWib(),
      });
      showToast("Saya sudah menuntaskan ini.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menandai selesai.");
    }
  };

  const stepText = useMemo(() => {
    if (secondsLeft === 0) {
      return "Gelombang sudah turun. Sekarang saya pilih langkah kecil.";
    }
    const elapsed = 60 - secondsLeft;
    if (elapsed < 15) {
      return "Letakkan bahu. Rahang longgar. Saya aman.";
    }
    if (elapsed < 40) {
      return "Tarik 4 detik... tahan 2... buang 6... (ulang)";
    }
    return "Sebut 1 hal yang bisa saya lakukan sekarang (kecil).";
  }, [secondsLeft]);

  const actionsDisabled = secondsLeft !== 0;

  return (
    <Page
      title="Drop Mode"
      subtitle="Saya tidak menyelesaikan hidup sekarang. Saya menurunkan gelombang dulu."
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

      {dropLogError ? (
        <EmptyState
          title="Saya tetap bisa mulai"
          body="Catatan drop hari ini belum tersimpan, tapi saya tetap bisa menenangkan diri."
        />
      ) : null}

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Skrip 60 Detik
        </p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-3xl font-semibold text-[color:var(--text)]">
            {formatTimer(secondsLeft)}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={isRunning}
              className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Mulai 60 detik
            </button>
            <button
              type="button"
              onClick={handlePause}
              disabled={!isRunning}
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--text)] disabled:opacity-60"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--text)]"
            >
              Ulang
            </button>
          </div>
        </div>
        <p className="mt-4 text-sm text-[color:var(--text)]">{stepText}</p>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Tindakan Setelah 60 Detik
        </p>
        {actionsDisabled ? (
          <p className="mt-3 text-xs text-[color:var(--muted)]">
            Selesaikan 60 detik dulu untuk membuka tindakan kecil.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            <PrimaryButton type="button" onClick={handleAddBreath} className="w-full">
              Tambah 1 sesi napas
            </PrimaryButton>
            <GhostButton
              type="button"
              onClick={() => setIsDelayOpen((prev) => !prev)}
              className="w-full"
            >
              Tunda keputusan
            </GhostButton>
            {isDelayOpen ? (
              <div className="space-y-3 rounded-[var(--radius-md)] border border-[color:var(--border)] p-3">
                <div className="space-y-2 text-xs text-[color:var(--muted)]">
                  <p>Pilih durasi tunda</p>
                  <div className="flex flex-wrap gap-2">
                    {delayOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
                      >
                        <input
                          type="radio"
                          name="delayChoice"
                          value={option.value}
                          checked={delayChoice === option.value}
                          onChange={() => setDelayChoice(option.value)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="block space-y-2 text-xs text-[color:var(--muted)]">
                  <span>Keputusan apa yang saya tunda?</span>
                  <textarea
                    value={delayTopic}
                    onChange={(event) => setDelayTopic(event.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]"
                  />
                </label>
                <PrimaryButton type="button" onClick={handleSaveDelay} className="w-full">
                  Simpan tunda
                </PrimaryButton>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Tunda Saya Hari Ini
        </p>
        {deferredList.length === 0 ? (
          <p className="mt-3 text-xs text-[color:var(--muted)]">
            Belum ada keputusan yang saya tunda hari ini.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {deferredList.map((item) => (
              <div
                key={item.id}
                className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2"
              >
                <p className="text-sm text-[color:var(--text)]">{item.topic}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">
                  Ingat lagi: {item.remindAtWib}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>{item.resolved ? "Selesai" : "Menunggu"}</span>
                  {!item.resolved ? (
                    <button
                      type="button"
                      onClick={() => handleResolve(item)}
                      className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
                    >
                      Selesai
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        <Link
          href="/"
          className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--text)]"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </Page>
  );
}
