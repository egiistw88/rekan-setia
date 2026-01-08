"use client";

import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/app/components/ui/Card";
import EmptyState from "@/app/components/ui/EmptyState";
import Page from "@/app/components/ui/Page";
import GhostButton from "@/app/components/ui/GhostButton";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import RemindersSettingsPanel from "@/app/components/RemindersSettingsPanel";
import ThemeSettingsPanel from "@/app/components/theme/ThemeSettingsPanel";
import { db } from "@/lib/db";
import { exportBackup, importBackup, type BackupPayload, type ImportMode } from "@/lib/backup";
import { ensureSettingsInitialized, useSettings } from "@/lib/settings";
import { formatNowWib } from "@/lib/time";

export default function SettingsPage() {
  const router = useRouter();
  const settings = useSettings();
  const [isRetrying, setIsRetrying] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);
  const [backupError, setBackupError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const [importPayload, setImportPayload] = useState<BackupPayload | null>(null);
  const [importPreview, setImportPreview] = useState<{
    exportedAtWib: string;
    tables: string[];
  } | null>(null);
  const [lastExportAt, setLastExportAt] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("rekan-setia-last-export");
    if (stored) {
      setLastExportAt(stored);
    }
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

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await ensureSettingsInitialized();
    } finally {
      setIsRetrying(false);
    }
  };

  const getBackupFilename = (stamp: string) => {
    const [datePart, timePart] = stamp.split(" ");
    if (!datePart || !timePart) {
      return "rekan-setia-backup.json";
    }
    const date = datePart.replace(/-/g, "");
    const time = timePart.replace(/:/g, "");
    return `rekan-setia-backup-${date}-${time}.json`;
  };

  const parseBackupPayload = (raw: string): BackupPayload => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("Ini bukan backup Rekan Setia.");
    }
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Ini bukan backup Rekan Setia.");
    }
    const payload = parsed as Partial<BackupPayload>;
    if (
      payload.app !== "rekan-setia" ||
      typeof payload.version !== "number" ||
      !payload.tables ||
      typeof payload.tables !== "object"
    ) {
      throw new Error("Ini bukan backup Rekan Setia.");
    }
    return payload as BackupPayload;
  };

  const handleExport = async () => {
    setBackupError("");
    setIsExporting(true);
    try {
      const payload = await exportBackup(db);
      const payloadText = JSON.stringify(payload, null, 2);
      const stamp = payload.exportedAtWib || formatNowWib();
      const filename = getBackupFilename(stamp);
      const blob = new Blob([payloadText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      window.localStorage.setItem("rekan-setia-last-export", stamp);
      setLastExportAt(stamp);
      showToast("Backup tersimpan.");
    } catch (error) {
      console.error(error);
      setBackupError("Backup gagal dibuat.");
      showToast("Backup gagal dibuat.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFilePick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setBackupError("");
    setImportPayload(null);
    setImportPreview(null);
    void file
      .text()
      .then((text) => {
        const payload = parseBackupPayload(text);
        const tables = Object.keys(payload.tables ?? {});
        setImportPayload(payload);
        setImportPreview({
          exportedAtWib: payload.exportedAtWib ?? payload.exportedAtIso ?? "-",
          tables,
        });
      })
      .catch((error) => {
        console.error(error);
        setBackupError("Ini bukan backup Rekan Setia.");
      });
  };

  const handleRestore = async () => {
    if (!importPayload) {
      setBackupError("Pilih file backup dulu.");
      return;
    }
    const confirmed = window.confirm(
      "Ini akan mengganti data saya di perangkat ini. Lanjut?",
    );
    if (!confirmed) {
      return;
    }
    setBackupError("");
    setIsImporting(true);
    try {
      const result = await importBackup(db, importPayload, importMode);
      if (result.tablesImported.length === 0) {
        throw new Error("Tidak ada tabel yang cocok untuk dipulihkan.");
      }
      showToast("Backup berhasil dipulihkan.");
      window.setTimeout(() => {
        router.push("/");
      }, 300);
    } catch (error) {
      console.error(error);
      setBackupError(
        error instanceof Error ? error.message : "Backup gagal dipulihkan.",
      );
      showToast("Backup gagal dipulihkan.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Ini akan menghapus semua data di perangkat ini.",
    );
    if (!confirmed) {
      return;
    }
    const confirmText = window.prompt('Ketik "RESET" untuk melanjutkan.');
    if (confirmText !== "RESET") {
      showToast("Reset dibatalkan.");
      return;
    }
    setBackupError("");
    setIsResetting(true);
    try {
      await db.transaction("rw", db.tables, async () => {
        for (const table of db.tables) {
          await table.clear();
        }
      });
      await ensureSettingsInitialized();
      window.localStorage.removeItem("rekan-setia-last-export");
      setLastExportAt("");
      showToast("Data direset.");
      window.setTimeout(() => {
        router.push("/");
      }, 300);
    } catch (error) {
      console.error(error);
      setBackupError("Reset gagal dijalankan.");
      showToast("Reset gagal dijalankan.");
    } finally {
      setIsResetting(false);
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

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Backup & Restore
            </p>
            <Card className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  Export backup
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  Backup berisi semua data lokal di perangkat ini.
                </p>
                <PrimaryButton
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-3 py-2 text-xs"
                >
                  {isExporting ? "Membuat backup..." : "Export Backup"}
                </PrimaryButton>
                {lastExportAt ? (
                  <p className="text-xs text-[color:var(--muted)]">
                    Terakhir export: {lastExportAt}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3 border-t border-[color:var(--border)] pt-4">
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  Import backup
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFilePick}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <GhostButton
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="px-3 py-2 text-xs"
                  >
                    Pilih file backup
                  </GhostButton>
                  <span className="text-xs text-[color:var(--muted)]">
                    {importPayload ? "File siap dipulihkan." : "Belum ada file."}
                  </span>
                </div>
                {importPreview ? (
                  <div className="space-y-1 text-xs text-[color:var(--muted)]">
                    <p>Exported: {importPreview.exportedAtWib}</p>
                    <p>
                      Tabel:{" "}
                      {importPreview.tables.length > 0
                        ? importPreview.tables.slice(0, 6).join(", ")
                        : "-"}
                      {importPreview.tables.length > 6
                        ? ` +${importPreview.tables.length - 6} lainnya`
                        : ""}
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-2 text-xs text-[color:var(--muted)] sm:grid-cols-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                    />
                    Replace (hapus lalu restore)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === "merge"}
                      onChange={() => setImportMode("merge")}
                    />
                    Merge (gabungkan)
                  </label>
                </div>
                <PrimaryButton
                  type="button"
                  onClick={handleRestore}
                  disabled={isImporting || !importPayload}
                  className="px-3 py-2 text-xs"
                >
                  {isImporting ? "Memulihkan..." : "Restore Backup"}
                </PrimaryButton>
              </div>

              <div className="space-y-3 border-t border-[color:var(--border)] pt-4">
                <p className="text-sm font-semibold text-[color:var(--text)]">
                  Reset semua data
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  Ini akan menghapus semua data di perangkat ini.
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isResetting}
                  className="rounded-[var(--radius-md)] border border-[color:var(--danger)] px-3 py-2 text-xs font-semibold text-[color:var(--danger)] transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResetting ? "Mereset..." : "Reset Semua Data"}
                </button>
              </div>

              {backupError ? (
                <p className="text-xs text-[color:var(--danger)]">
                  {backupError}
                </p>
              ) : null}
            </Card>
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

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)]"
        >
          {toast}
        </div>
      ) : null}
    </Page>
  );
}
