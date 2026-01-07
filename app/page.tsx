"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const isNightWindow = (date: Date) => {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 21 * 60 || minutes < 3 * 60;
};

export default function Home() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  const isNight = useMemo(() => isNightWindow(now), [now]);

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
