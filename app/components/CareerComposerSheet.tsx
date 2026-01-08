"use client";

import type { ChangeEvent } from "react";
import BottomSheet from "@/app/components/ui/BottomSheet";
import PrimaryButton from "@/app/components/ui/PrimaryButton";
import type { CareerLeadRecord } from "@/lib/db";

type TemplateOption = {
  id: string;
  title: string;
};

type CareerComposerSheetProps = {
  open: boolean;
  onClose: () => void;
  lead: CareerLeadRecord | null;
  templates: TemplateOption[];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  message: string;
  onMessageChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onCopy: () => void;
  onMarkSent: () => void;
};

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-[color:var(--border)] bg-transparent px-3 py-2 text-sm text-[color:var(--text)]";

export default function CareerComposerSheet({
  open,
  onClose,
  lead,
  templates,
  selectedTemplateId,
  onTemplateChange,
  message,
  onMessageChange,
  notes,
  onNotesChange,
  onCopy,
  onMarkSent,
}: CareerComposerSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Kirim chat">
      {lead ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[color:var(--text)]">
              Untuk: {lead.name}
            </p>
            <p className="text-xs text-[color:var(--muted)]">
              {lead.platform} - {lead.handleOrContact || "-"}
            </p>
          </div>

          <label className="space-y-2 text-xs text-[color:var(--muted)]">
            <span>Template</span>
            <select
              value={selectedTemplateId}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                onTemplateChange(event.target.value)
              }
              className={inputClass}
            >
              <option value="">Pilih template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs text-[color:var(--muted)]">
            <span>Kalimat saya</span>
            <textarea
              value={message}
              onChange={(event) => onMessageChange(event.target.value)}
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </label>

          <label className="space-y-2 text-xs text-[color:var(--muted)]">
            <span>Catatan lead (opsional)</span>
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--text)]"
            >
              Copy
            </button>
            <PrimaryButton type="button" onClick={onMarkSent}>
              Tandai terkirim
            </PrimaryButton>
          </div>

          <p className="text-xs text-[color:var(--muted)]">
            Kalau tidak dibalas, saya follow-up 2 hari lagi.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-[color:var(--muted)]">
          <p>Saya belum punya lead. Saya mulai dari 1 saja.</p>
        </div>
      )}
    </BottomSheet>
  );
}
