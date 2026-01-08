"use client";

import { useState } from "react";
import Card from "@/app/components/ui/Card";
import Page from "@/app/components/ui/Page";
import EmptyState from "@/app/components/ui/EmptyState";
import RemindersSettingsPanel from "@/app/components/RemindersSettingsPanel";
import ThemeSettingsPanel from "@/app/components/theme/ThemeSettingsPanel";
import { ensureSettingsInitialized, useSettings } from "@/lib/settings";

export default function SettingsPage() {
  const settings = useSettings();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await ensureSettingsInitialized();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Page
      title="Pengaturan"
      subtitle="Saya memilih ritme yang membuat saya stabil."
    >
      {!settings ? (
        <EmptyState
          title="Pengaturan belum siap"
          body="Saya coba tarik ulang data pengaturan dulu."
          primaryLabel={isRetrying ? "Memuat..." : "Coba lagi"}
          primaryOnClick={handleRetry}
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Tema
            </p>
            <ThemeSettingsPanel />
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Pengingat
            </p>
            <RemindersSettingsPanel />
          </div>

          <Card>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Target
            </p>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Untuk sekarang saya pakai target default. Nanti saya rapikan di
              sini.
            </p>
          </Card>
        </div>
      )}
    </Page>
  );
}
