"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@/app/components/ui/Card";
import EmptyState from "@/app/components/ui/EmptyState";
import GhostButton from "@/app/components/ui/GhostButton";
import Page from "@/app/components/ui/Page";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import { db } from "@/lib/db";
import { duaTemplates } from "@/lib/duaTemplates";
import { getTodayDateKey, upsertDailyLogPatch } from "@/lib/logs";
import { formatNowWib, getJakartaDateKey } from "@/lib/time";

const buildRecentKeys = (days: number) => {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(now.getTime() - i * 86400000);
    keys.push(getJakartaDateKey(date));
  }
  return keys;
};

const formatTimer = (secondsLeft: number) => {
  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

export default function SpiritualPage() {
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);

  const [wudhuSecondsLeft, setWudhuSecondsLeft] = useState(60);
  const [wudhuRunning, setWudhuRunning] = useState(false);

  const [duaNote, setDuaNote] = useState("");
  const [duaTemplateId, setDuaTemplateId] = useState<string | undefined>(
    undefined,
  );
  const [istighfarCount, setIstighfarCount] = useState(0);
  const [quranMinutes, setQuranMinutes] = useState(0);
  const [wudhuDone, setWudhuDone] = useState(false);

  const dateKey = useMemo(() => getTodayDateKey(), []);
  const recentKeys = useMemo(() => buildRecentKeys(14), []);
  const recentSignature = useMemo(() => recentKeys.join("|"), [recentKeys]);

  const dailyLog = useLiveQuery(() => db.dailyLogs.get(dateKey), [dateKey]);
  const recentLogs = useLiveQuery(
    () => db.dailyLogs.bulkGet(recentKeys),
    [recentSignature],
  );

  useEffect(() => {
    if (!dailyLog) {
      setDuaNote("");
      setDuaTemplateId(undefined);
      setIstighfarCount(0);
      setQuranMinutes(0);
      setWudhuDone(false);
      return;
    }
    setDuaNote(dailyLog.spiritual?.duaNote ?? "");
    setDuaTemplateId(dailyLog.spiritual?.duaTemplateId);
    setIstighfarCount(dailyLog.spiritual?.istighfarCount ?? 0);
    setQuranMinutes(dailyLog.spiritual?.quranMinutes ?? 0);
    setWudhuDone(Boolean(dailyLog.spiritual?.wudhuResetDone));
  }, [dailyLog]);

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!wudhuRunning) {
      return;
    }
    const interval = window.setInterval(() => {
      setWudhuSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setWudhuRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [wudhuRunning]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast("");
    }, 2000);
  };

  const subuhDone = Boolean(dailyLog?.subuhDone);
  const subuhCopy = subuhDone
    ? "Saya pegang Subuh hari ini."
    : "Saya belum pegang Subuh. Saya mulai lagi pelan.";

  const subuhStreak = useMemo(() => {
    const logs = recentLogs ?? [];
    let count = 0;
    for (const entry of logs) {
      if (!entry) {
        continue;
      }
      if (entry.subuhDone) {
        count += 1;
        continue;
      }
      break;
    }
    return count;
  }, [recentLogs]);

  const handleToggleSubuh = async () => {
    const nextValue = !subuhDone;
    try {
      await upsertDailyLogPatch(dateKey, { subuhDone: nextValue });
      showToast(nextValue ? "Saya pegang Subuh." : "Saya mulai lagi besok.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan Subuh.");
    }
  };

  const handleWudhuStart = () => {
    if (wudhuSecondsLeft === 0) {
      setWudhuSecondsLeft(60);
    }
    setWudhuRunning(true);
  };

  const handleWudhuPause = () => {
    setWudhuRunning(false);
  };

  const handleWudhuReset = () => {
    setWudhuRunning(false);
    setWudhuSecondsLeft(60);
  };

  const handleWudhuDone = async () => {
    try {
      await upsertDailyLogPatch(dateKey, {
        spiritual: { wudhuResetDone: true, updatedAtWib: formatNowWib() },
      });
      setWudhuDone(true);
      showToast("Saya reset wudhu.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan wudhu.");
    }
  };

  const handleUseTemplate = (templateId: string, text: string) => {
    setDuaTemplateId(templateId);
    setDuaNote(text);
  };

  const handleSaveDua = async () => {
    const trimmed = duaNote.trim();
    if (!trimmed) {
      showToast("Doa saya masih kosong.");
      return;
    }
    try {
      await upsertDailyLogPatch(dateKey, {
        spiritual: {
          duaTemplateId,
          duaNote: trimmed,
          updatedAtWib: formatNowWib(),
        },
      });
      showToast("Doa saya tersimpan.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan doa.");
    }
  };

  const updateIstighfar = async (nextValue: number) => {
    const clamped = clamp(nextValue, 0, 200);
    setIstighfarCount(clamped);
    try {
      await upsertDailyLogPatch(dateKey, {
        spiritual: { istighfarCount: clamped, updatedAtWib: formatNowWib() },
      });
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan istighfar.");
    }
  };

  const updateQuranMinutes = async (nextValue: number) => {
    const clamped = clamp(nextValue, 0, 30);
    setQuranMinutes(clamped);
    try {
      await upsertDailyLogPatch(dateKey, {
        spiritual: { quranMinutes: clamped, updatedAtWib: formatNowWib() },
      });
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan Qur'an.");
    }
  };

  const recommendedTemplates = duaTemplates.slice(0, 3);
  const extraTemplates = duaTemplates.slice(3);

  const hasAnySpiritualData =
    Boolean(dailyLog?.subuhDone) ||
    Boolean(dailyLog?.spiritual?.duaNote) ||
    Boolean(dailyLog?.spiritual?.wudhuResetDone) ||
    Boolean(dailyLog?.spiritual?.istighfarCount) ||
    Boolean(dailyLog?.spiritual?.quranMinutes);

  return (
    <Page title="Spiritual" subtitle="Saya tetap tersambung, meski minimal.">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)]"
        >
          {toast}
        </div>
      ) : null}

      {!hasAnySpiritualData ? (
        <EmptyState
          title="Saya mulai dari Subuh"
          body="Satu langkah kecil sudah cukup untuk mulai."
          primaryLabel={subuhDone ? undefined : "Pegang Subuh"}
          primaryOnClick={subuhDone ? undefined : handleToggleSubuh}
        />
      ) : null}

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Status Hari Ini
        </p>
        <div className="mt-3 space-y-1 text-sm text-[color:var(--text)]">
          <p>Pegang Subuh: {subuhDone ? "YA" : "BELUM"}</p>
          <p>Streak Subuh: {subuhStreak} hari</p>
        </div>
        <p className="mt-3 text-xs text-[color:var(--muted)]">{subuhCopy}</p>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Pegangan minimal
        </p>
        <div className="mt-3 space-y-2">
          <GhostButton type="button" onClick={handleToggleSubuh} className="w-full">
            {subuhDone ? "Batalkan Subuh" : "Pegang Subuh"}
          </GhostButton>
          <details className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--muted)]">
            <summary className="cursor-pointer">Wudhu reset 60 detik</summary>
            <div className="mt-3 space-y-3 text-sm text-[color:var(--text)]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[color:var(--muted)]">
                  {wudhuDone ? "Sudah dilakukan" : "Belum"}
                </span>
                <span className="text-lg font-semibold text-[color:var(--text)]">
                  {formatTimer(wudhuSecondsLeft)}
                </span>
              </div>
              <p className="text-xs text-[color:var(--muted)]">
                Bahu turun. Rahang longgar. Saya mulai lagi.
              </p>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton
                  type="button"
                  onClick={handleWudhuStart}
                  disabled={wudhuRunning}
                >
                  Start
                </PrimaryButton>
                <GhostButton
                  type="button"
                  onClick={handleWudhuPause}
                  disabled={!wudhuRunning}
                >
                  Pause
                </GhostButton>
                <GhostButton type="button" onClick={handleWudhuReset}>
                  Reset
                </GhostButton>
                <GhostButton type="button" onClick={handleWudhuDone}>
                  Selesai
                </GhostButton>
              </div>
            </div>
          </details>
          <details className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--muted)]">
            <summary className="cursor-pointer">Doa jujur 20 detik</summary>
            <div className="mt-3 space-y-3">
              <div className="grid gap-3">
                {recommendedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-[color:var(--text)]">
                      {template.title}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      {template.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleUseTemplate(template.id, template.text)}
                      className="mt-2 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
                    >
                      Pakai
                    </button>
                  </div>
                ))}
              </div>
              {extraTemplates.length > 0 ? (
                <details className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--muted)]">
                  <summary className="cursor-pointer">Lihat semua</summary>
                  <div className="mt-3 grid gap-3">
                    {extraTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-[color:var(--text)]">
                          {template.title}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                          {template.text}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            handleUseTemplate(template.id, template.text)
                          }
                          className="mt-2 rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
                        >
                          Pakai
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
              <label className="block space-y-2 text-xs text-[color:var(--muted)]">
                <span>Doa saya malam ini</span>
                <textarea
                  value={duaNote}
                  onChange={(event) => setDuaNote(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]"
                />
              </label>
              <PrimaryButton type="button" onClick={handleSaveDua}>
                Simpan doa
              </PrimaryButton>
            </div>
          </details>
        </div>
      </Card>

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Ringan setelah Subuh (opsional)
        </p>
        <div className="mt-3 space-y-3">
          <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--text)]">
                Istighfar
              </p>
              <span className="text-sm font-semibold text-[color:var(--text)]">
                {istighfarCount}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateIstighfar(istighfarCount + 1)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => updateIstighfar(istighfarCount + 10)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => updateIstighfar(0)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[color:var(--text)]">
                Quran (menit)
              </p>
              <span className="text-sm text-[color:var(--text)]">
                {quranMinutes} menit
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={quranMinutes}
              onChange={(event) =>
                updateQuranMinutes(Number(event.target.value))
              }
              className="mt-2 w-full"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateQuranMinutes(quranMinutes + 1)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => updateQuranMinutes(0)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-2 text-center">
        <p className="text-xs text-[color:var(--muted)]">
          Kalau saya cuma sanggup satu langkah kecil, itu tetap dihitung.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--text)]"
        >
          Kembali ke Dashboard
        </Link>
      </section>
    </Page>
  );
}
