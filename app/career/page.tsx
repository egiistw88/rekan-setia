"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/app/components/PageShell";
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
const statusOptions: CareerLeadStatus[] = [
  "baru",
  "dihubungi",
  "followup",
  "respons",
  "klien",
  "tutup",
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
  const resolved = template
    .replace(/\{nama\}/g, lead.name || "teman")
    .replace(/\{bisnis\}/g, getBisnisText(lead.niche))
    .replace(/\{jasa\}/g, jasaDefault)
    .replace(/\{contoh\}/g, contohDefault);
  return resolved;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function CareerPage() {
  const [toast, setToast] = useState("");
  const toastTimeout = useRef<number | null>(null);
  const dateKey = useMemo(() => getTodayDateKey(), []);
  const careerLog = useLiveQuery(() => db.careerLogs.get(dateKey), [dateKey]);
  const leads = useLiveQuery(() => db.careerLeads.toArray(), []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CareerLeadStatus | "all">(
    "all",
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [composerText, setComposerText] = useState("");
  const [leadNotes, setLeadNotes] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] =
    useState<CareerLeadPlatform>("WA");
  const [formHandle, setFormHandle] = useState("");
  const [formNiche, setFormNiche] = useState<CareerLeadNiche>("UMKM");
  const [formStatus, setFormStatus] = useState<CareerLeadStatus>("baru");
  const [formNotes, setFormNotes] = useState("");

  const todayKey = useMemo(() => getJakartaDateKey(new Date()), []);

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

  const filteredLeads = useMemo(() => {
    const list = leads ?? [];
    const query = search.trim().toLowerCase();
    return list.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) {
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
  }, [leads, search, statusFilter]);

  const selectedLead = useMemo(() => {
    return (leads ?? []).find((lead) => lead.id === selectedLeadId) ?? null;
  }, [leads, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead) {
      setComposerText("");
      setLeadNotes("");
      setSelectedTemplateId("");
      return;
    }
    setLeadNotes(selectedLead.notes ?? "");
  }, [selectedLead]);

  const handleAddLead = () => {
    setEditingId(null);
    setFormName("");
    setFormPlatform("WA");
    setFormHandle("");
    setFormNiche("UMKM");
    setFormStatus("baru");
    setFormNotes("");
    setIsFormOpen(true);
  };

  const handleEditLead = (lead: CareerLeadRecord) => {
    setEditingId(lead.id);
    setFormName(lead.name);
    setFormPlatform(lead.platform);
    setFormHandle(lead.handleOrContact);
    setFormNiche(lead.niche);
    setFormStatus(lead.status);
    setFormNotes(lead.notes ?? "");
    setIsFormOpen(true);
  };

  const handleSaveLead = async () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      showToast("Nama lead perlu diisi.");
      return;
    }
    const id = editingId ?? createId();
    try {
      await upsertCareerLeadPatch(id, {
        name: trimmedName,
        platform: formPlatform,
        handleOrContact: formHandle.trim(),
        niche: formNiche,
        status: formStatus,
        notes: formNotes.trim(),
      });
      setIsFormOpen(false);
      showToast(editingId ? "Lead diperbarui." : "Lead baru disimpan.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menyimpan lead.");
    }
  };

  const handleSelectLead = (lead: CareerLeadRecord) => {
    setSelectedLeadId(lead.id);
    const template = careerTemplates.find((item) => item.tags.includes("pembuka"));
    if (template) {
      setSelectedTemplateId(template.id);
      setComposerText(resolveTemplate(template.text, lead));
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
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa mencatat chat.");
    }
  };

  const handleChatIncrement = async () => {
    const currentChats = careerLog?.clientChatsSent ?? 0;
    const nextChats = Math.min(3, currentChats + 1);
    try {
      await upsertCareerLogPatch(dateKey, { clientChatsSent: nextChats });
      showToast("Saya bergerak: 1 chat.");
    } catch (error) {
      console.error(error);
      showToast("Saya belum bisa menambah chat.");
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

  const followupLeads = useMemo(() => {
    return (leads ?? []).filter((lead) => {
      if (!lead.nextFollowupAtWib) {
        return false;
      }
      const followDate = lead.nextFollowupAtWib.slice(0, 10);
      return followDate <= todayKey;
    });
  }, [leads, todayKey]);

  const handleSelectFollowup = (lead: CareerLeadRecord) => {
    setSelectedLeadId(lead.id);
    const followTemplate = careerTemplates.find((item) =>
      item.tags.includes("followup"),
    );
    if (followTemplate) {
      setSelectedTemplateId(followTemplate.id);
      setComposerText(resolveTemplate(followTemplate.text, lead));
    }
  };

  return (
    <PageShell title="Karier" description="Saya bergerak pelan, tapi saya bergerak.">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--foreground)]"
        >
          {toast}
        </div>
      ) : null}

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Tracker Hari Ini (0-3)
        </p>
        <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
          {careerLog?.clientChatsSent ?? 0}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleChatIncrement}
            className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white"
          >
            +1 chat
          </button>
          <button
            type="button"
            onClick={handleChatReset}
            className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--foreground)]"
          >
            Reset hari ini
          </button>
        </div>
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          Saya cukup kirim 1 chat. Itu sudah bergerak.
        </p>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Lead List
          </p>
          <button
            type="button"
            onClick={handleAddLead}
            className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground)]"
          >
            Tambah Lead
          </button>
        </div>

        {isFormOpen ? (
          <div className="mt-4 space-y-3 rounded-xl border border-[color:var(--border)] p-3">
            <label className="block space-y-2 text-xs text-[color:var(--muted)]">
              <span>Nama lead</span>
              <input
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)]"
              />
            </label>
            <label className="block space-y-2 text-xs text-[color:var(--muted)]">
              <span>Platform</span>
              <select
                value={formPlatform}
                onChange={(event) =>
                  setFormPlatform(event.target.value as CareerLeadPlatform)
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)]"
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
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)]"
              />
            </label>
            <label className="block space-y-2 text-xs text-[color:var(--muted)]">
              <span>Niche</span>
              <select
                value={formNiche}
                onChange={(event) =>
                  setFormNiche(event.target.value as CareerLeadNiche)
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)]"
              >
                {nicheOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-xs text-[color:var(--muted)]">
              <span>Status</span>
              <select
                value={formStatus}
                onChange={(event) =>
                  setFormStatus(event.target.value as CareerLeadStatus)
                }
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)]"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusLabel[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-xs text-[color:var(--muted)]">
              <span>Catatan (opsional)</span>
              <textarea
                value={formNotes}
                onChange={(event) => setFormNotes(event.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveLead}
                className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white"
              >
                Simpan Lead
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--foreground)]"
              >
                Batal
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama / kontak"
            className="flex-1 rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-xs text-[color:var(--foreground)]"
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as CareerLeadStatus | "all")
            }
            className="rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-xs text-[color:var(--foreground)]"
          >
            <option value="all">Semua status</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {statusLabel[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {filteredLeads.length === 0 ? (
            <p className="text-xs text-[color:var(--muted)]">
              Belum ada lead yang cocok.
            </p>
          ) : (
            filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-xl border border-[color:var(--border)] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--foreground)]">
                      {lead.name}
                    </p>
                    <p className="text-xs text-[color:var(--muted)]">
                      {lead.platform} - {lead.handleOrContact || "-"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                    {statusLabel[lead.status]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[color:var(--muted)]">
                  Terakhir kontak: {lead.lastContactAtWib ?? "-"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectLead(lead)}
                    className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-white"
                  >
                    Pilih
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditLead(lead)}
                    className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground)]"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Composer DM
        </p>
        {selectedLead ? (
          <>
            <p className="mt-2 text-sm text-[color:var(--foreground)]">
              Untuk: {selectedLead.name}
            </p>
            <label className="mt-3 block space-y-2 text-xs text-[color:var(--muted)]">
              <span>Template</span>
              <select
                value={selectedTemplateId}
                onChange={(event) => handleTemplateChange(event.target.value)}
                className="w-full rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)]"
              >
                <option value="">Pilih template</option>
                {careerTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block space-y-2 text-xs text-[color:var(--muted)]">
              <span>Kalimat saya</span>
              <textarea
                value={composerText}
                onChange={(event) => setComposerText(event.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)]"
              />
            </label>
            <label className="mt-3 block space-y-2 text-xs text-[color:var(--muted)]">
              <span>Catatan lead (opsional)</span>
              <textarea
                value={leadNotes}
                onChange={(event) => setLeadNotes(event.target.value)}
                rows={2}
                className="w-full resize-none rounded-xl border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--foreground)]"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--foreground)]"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleMarkSent}
                className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold text-white"
              >
                Tandai Terkirim
              </button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-xs text-[color:var(--muted)]">
            Pilih lead dulu supaya saya bisa menulis pesan.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Follow-up Hari Ini
        </p>
        <div className="mt-3 space-y-2 text-sm">
          {followupLeads.length === 0 ? (
            <p className="text-xs text-[color:var(--muted)]">
              Belum ada follow-up untuk hari ini.
            </p>
          ) : (
            followupLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-xl border border-[color:var(--border)] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-[color:var(--foreground)]">
                    {lead.name}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    Jadwal: {lead.nextFollowupAtWib}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectFollowup(lead)}
                  className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground)]"
                >
                  Follow up
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}

