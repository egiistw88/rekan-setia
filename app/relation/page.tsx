"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PageShell from "@/app/components/PageShell";
import { getTodayDateKey, upsertDailyLogPatch } from "@/lib/logs";

export default function RelationPage() {
  const searchParams = useSearchParams();
  const shouldAutoStart = searchParams.get("start") === "1";
  const ritualRef = useRef<HTMLDivElement | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);
  const dateKey = useRef(getTodayDateKey());

  useEffect(() => {
    if (shouldAutoStart) {
      setIsRunning(true);
      ritualRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [shouldAutoStart]);

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

  const handleStart = () => {
    setIsRunning(true);
    ritualRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleFinish = async () => {
    try {
      await upsertDailyLogPatch(dateKey.current, { ritualDone: true });
      setIsRunning(false);
      showToast("Saya sudah hadir.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan ritual.");
    }
  };

  return (
    <PageShell title="Relasi" description="Saya hadir, walau hanya sebentar.">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--foreground)]"
        >
          {toast}
        </div>
      ) : null}

      <section
        ref={ritualRef}
        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Ritual 7 Menit
        </p>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Saya hadir sebentar saja. Tidak harus sempurna.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white"
            >
              Mulai Ritual
            </button>
          ) : (
            <>
              <span className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--foreground)]">
                Ritual sedang berjalan
              </span>
              <button
                type="button"
                onClick={handleFinish}
                className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white"
              >
                Selesai Ritual
              </button>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
