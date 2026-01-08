"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import Card from "@/app/components/ui/Card";
import EmptyState from "@/app/components/ui/EmptyState";
import GhostButton from "@/app/components/ui/GhostButton";
import Page from "@/app/components/ui/Page";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import CareerComposerSheet from "@/app/components/CareerComposerSheet";
import {
  type CareerLeadNiche,
  type CareerLeadPlatform,
  type CareerLeadRecord,
  type CareerLeadStatus,
  db,
} from "@/lib/db";
import {
  getTodayDateKey,
  upsertCareerLeadPatch,
  upsertCareerLogPatch,
} from "@/lib/logs";
import { careerTemplates } from "@/lib/careerTemplates";
import { addDaysWib, formatNowWib, getJakartaDateKey } from "@/lib/time";

const jasaDefault = "desain feed/poster/logo sederhana";
const contohDefault = "boleh saya kirim 1 contoh desain singkat?";

const statusLabel: Record<CareerLeadStatus, string> = {
  baru: "Baru",
  dihubungi: "Dihubungi",
  followup: "Follow up",
  respons: "Respons",
  klien: "Klien",
  tutup: "Tutup",
};

const platformOptions: CareerLeadPlatform[] = [
  "WA",
  "IG",
  "FB",
  "Email",
  "Other",
];
const nicheOptions: CareerLeadNiche[] = [
  "UMKM",
  "Event",
  "Food",
  "Fashion",
  "Education",
  "Other",
];

const getBisnisText = (niche: CareerLeadNiche) => {
  switch (niche) {
    case "Event":
      return "event";
    case "Food":
      return "usaha makanan";
    case "Fashion":
      return "usaha fashion";
    case "Education":
      return "usaha pendidikan";
    case "UMKM":
      return "usaha";
    default:
      return "usaha";
  }
};

const resolveTemplate = (template: string, lead: CareerLeadRecord) => {
  return template
    .replace(/\{nama\}/g, lead.name || "teman")
    .replace(/\{bisnis\}/g, getBisnisText(lead.niche))
    .replace(/\{jasa\}/g, jasaDefault)
    .replace(/\{contoh\}/g, contohDefault);
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]";

export default function CareerPage() {
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);
  const dateKey = useMemo(() => getTodayDateKey(), []);
  const todayKey = useMemo(() => getJakartaDateKey(new Date()), []);
  const careerLog = useLiveQuery(() => db.careerLogs.get(dateKey), [dateKey]);
  const leads = useLiveQuery(() => db.careerLeads.toArray(), []);

  const [search, setSearch] = useState("");
  const [followupOnly, setFollowupOnly] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [composerText, setComposerText] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] =
    useState<CareerLeadPlatform>("WA");
  const [formHandle, setFormHandle] = useState("");
  const [formNiche, setFormNiche] = useState<CareerLeadNiche>("UMKM");

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

  const allLeads = leads ?? [];

  const isFollowupDue = (lead: CareerLeadRecord) => {
    if (!lead.nextFollowupAtWib) {
      return false;
    }
    return lead.nextFollowupAtWib.slice(0, 10) <= todayKey;
  };

  const followupCount = useMemo(() => {
    return allLeads.filter(isFollowupDue).length;
  }, [allLeads, todayKey]);

  const showLeadCard = allLeads.length > 0 || isFormOpen;

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allLeads.filter((lead) => {
      if (followupOnly && !isFollowupDue(lead)) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        lead.name.toLowerCase().includes(query) ||
        lead.handleOrContact.toLowerCase().includes(query)
      );
    });
  }, [allLeads, followupOnly, search, todayKey]);

  const selectedLead = useMemo(() => {
    return allLeads.find((lead) => lead.id === selectedLeadId) ?? null;
  }, [allLeads, selectedLeadId]);

  const pickTemplate = (tag: string) => {
    return (
      careerTemplates.find((template) => template.tags.includes(tag)) ??
      careerTemplates[0]
    );
  };

  const openComposerForLead = (lead: CareerLeadRecord, preferFollowup: boolean) => {
    setSelectedLeadId(lead.id);
    setIsSheetOpen(true);
    setLeadNotes(lead.notes ?? "");
    const template = pickTemplate(preferFollowup ? "followup" : "pembuka");
    if (template) {
      setSelectedTemplateId(template.id);
      setComposerText(resolveTemplate(template.text, lead));
    } else {
      setSelectedTemplateId("");
      setComposerText("");
    }
  };

  const handlePrimaryAction = () => {
    if (allLeads.length === 0) {
      setIsFormOpen(true);
      showToast("Saya mulai dari 1 lead dulu.");
      return;
    }

    const dueLead = allLeads
      .filter(isFollowupDue)
      .sort((a, b) => (a.nextFollowupAtWib ?? "").localeCompare(b.nextFollowupAtWib ?? ""))[0];
    const newLead = allLeads.find((lead) => lead.status === "baru");
    const followLead = allLeads.find((lead) => lead.status === "followup");
    const candidate = dueLead ?? newLead ?? followLead ?? allLeads[0];
    if (candidate) {
      openComposerForLead(candidate, isFollowupDue(candidate));
    }
  };

  const handleAddLead = () => {
    setFormName("");
    setFormPlatform("WA");
    setFormHandle("");
    setFormNiche("UMKM");
    setIsFormOpen(true);
  };

  const handleSaveLead = async () => {
    const trimmedName = formName.trim();
    const trimmedHandle = formHandle.trim();
    if (!trimmedName || !trimmedHandle) {
      showToast("Nama dan kontak perlu diisi.");
      return;
    }
    const id = createId();
    try {
      await upsertCareerLeadPatch(id, {
        name: trimmedName,
        platform: formPlatform,
        handleOrContact: trimmedHandle,
        niche: formNiche,
        status: "baru",
      });
      setIsFormOpen(false);
      showToast("Lead baru disimpan.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan lead.");
    }
  };

  const handleTemplateChange = (templateId: string) => {
    if (!selectedLead) {
      return;
    }
    setSelectedTemplateId(templateId);
    const template = careerTemplates.find((item) => item.id === templateId);
    if (template) {
      setComposerText(resolveTemplate(template.text, selectedLead));
    }
  };

  const handleCopy = async () => {
    if (!composerText.trim()) {
      showToast("Teks belum siap untuk disalin.");
      return;
    }
    try {
      await navigator.clipboard.writeText(composerText);
      showToast("Teks berhasil disalin.");
    } catch (error) {
      console.error(error);
      const textarea = document.createElement("textarea");
      textarea.value = composerText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showToast("Teks berhasil disalin.");
    }
  };

  const getNextStatus = (status: CareerLeadStatus) => {
    if (status === "baru") {
      return "dihubungi";
    }
    if (status === "dihubungi") {
      return "followup";
    }
    if (status === "followup") {
      return "respons";
    }
    return status;
  };

  const handleMarkSent = async () => {
    if (!selectedLead) {
      return;
    }
    const trimmedText = composerText.trim();
    if (!trimmedText) {
      showToast("Kalimat saya masih kosong.");
      return;
    }
    const nextStatus = getNextStatus(selectedLead.status);
    const nowWib = formatNowWib();
    const nextFollowup = addDaysWib(new Date(), 2);
    const currentChats = careerLog?.clientChatsSent ?? 0;
    const nextChats = Math.min(3, currentChats + 1);
    try {
      await Promise.all([
        upsertCareerLeadPatch(selectedLead.id, {
          status: nextStatus,
          lastContactAtWib: nowWib,
          nextFollowupAtWib: nextFollowup,
          notes: leadNotes.trim(),
        }),
        upsertCareerLogPatch(dateKey, { clientChatsSent: nextChats }),
      ]);
      showToast("Saya kirim 1 chat.");
      setIsSheetOpen(false);
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa mencatat chat.");
    }
  };

  const handleChatReset = async () => {
    try {
      await upsertCareerLogPatch(dateKey, { clientChatsSent: 0 });
      showToast("Tracker hari ini direset.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa mereset tracker.");
    }
  };

  const handleSelectLead = (lead: CareerLeadRecord) => {
    openComposerForLead(lead, isFollowupDue(lead));
  };

  const chatCount = careerLog?.clientChatsSent ?? 0;
  const progressPercent = Math.min(100, Math.round((chatCount / 3) * 100));

  return (
    <Page
      title="Karier"
      subtitle="Saya cukup bergerak 1 chat. Itu sudah menang."
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

      <Card>
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Hari ini
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-[color:var(--muted)]">Chat hari ini</p>
          <p className="text-lg font-semibold text-[color:var(--text)]">
            {chatCount}/3
          </p>
        </div>
        <div className="mt-3 h-1 w-full rounded-full bg-[color:var(--surface2)]">
          <div
            className="h-full rounded-full bg-[color:var(--accent)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Target saya: 1 chat.
        </p>
        <div className="mt-3">
          <GhostButton
            type="button"
            onClick={handleChatReset}
            className="px-3 py-2 text-xs"
          >
            Reset
          </GhostButton>
        </div>
      </Card>

      {!showLeadCard ? (
        <EmptyState
          title="Saya mulai dari 1 lead"
          body="Cukup satu nama untuk saya kirim chat hari ini."
          primaryLabel="Tambah lead"
          primaryOnClick={handleAddLead}
        />
      ) : (
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Lead
            </p>
            <button
              type="button"
              onClick={handleAddLead}
              className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
            >
              Tambah lead
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {followupCount > 0 ? (
              <button
                type="button"
                onClick={() => setFollowupOnly((prev) => !prev)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text)]"
              >
                {followupOnly
                  ? "Semua lead"
                  : `Follow-up due: ${followupCount}`}
              </button>
            ) : (
              <p className="text-xs text-[color:var(--muted)]">
                Belum ada follow-up hari ini.
              </p>
            )}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama / kontak"
              className={inputClass}
            />
          </div>

          {isFormOpen ? (
            <div className="mt-4 space-y-3 rounded-[var(--radius-md)] border border-[color:var(--border)] p-3">
              <label className="block space-y-2 text-xs text-[color:var(--muted)]">
                <span>Nama lead</span>
                <input
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block space-y-2 text-xs text-[color:var(--muted)]">
                <span>Platform</span>
                <select
                  value={formPlatform}
                  onChange={(event) =>
                    setFormPlatform(event.target.value as CareerLeadPlatform)
                  }
                  className={inputClass}
                >
                  {platformOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-xs text-[color:var(--muted)]">
                <span>Kontak</span>
                <input
                  value={formHandle}
                  onChange={(event) => setFormHandle(event.target.value)}
                  placeholder="@ig / nomor WA"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-2 text-xs text-[color:var(--muted)]">
                <span>Niche (opsional)</span>
                <select
                  value={formNiche}
                  onChange={(event) =>
                    setFormNiche(event.target.value as CareerLeadNiche)
                  }
                  className={inputClass}
                >
                  {nicheOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveLead}
                  className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white"
                >
                  Simpan lead
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--text)]"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {filteredLeads.length === 0 ? (
              <p className="text-xs text-[color:var(--muted)]">
                Belum ada lead yang cocok.
              </p>
            ) : (
              filteredLeads.map((lead) => {
                const due = isFollowupDue(lead);
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => handleSelectLead(lead)}
                    className="w-full rounded-[var(--radius-md)] border border-[color:var(--border)] px-4 py-3 text-left transition hover:border-[color:var(--accent)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[color:var(--text)]">
                          {lead.name}
                        </p>
                        <p className="text-xs text-[color:var(--muted)]">
                          {lead.platform} - {lead.handleOrContact || "-"}
                        </p>
                      </div>
                      <span className="rounded-full bg-[color:var(--surface2)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--muted)]">
                        {statusLabel[lead.status]}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-[color:var(--muted)]">
                      {due ? (
                        <span className="rounded-full bg-[color:var(--warn)]/15 px-2 py-0.5 text-[color:var(--warn)]">
                          Follow-up
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>
      )}

      <div
        className="fixed inset-x-0 z-30 border-t border-[color:var(--border)] bg-[color:var(--surface2)]/95 backdrop-blur"
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-[560px] px-5 py-3">
          <PrimaryButton
            type="button"
            onClick={handlePrimaryAction}
            className="w-full"
          >
            Kirim 1 chat
          </PrimaryButton>
        </div>
      </div>

      <CareerComposerSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        lead={selectedLead}
        templates={careerTemplates}
        selectedTemplateId={selectedTemplateId}
        onTemplateChange={handleTemplateChange}
        message={composerText}
        onMessageChange={setComposerText}
        notes={leadNotes}
        onNotesChange={setLeadNotes}
        onCopy={handleCopy}
        onMarkSent={handleMarkSent}
      />
    </Page>
  );
}
