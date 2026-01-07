"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import IconButton from "@/app/components/ui/IconButton";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    panelRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 cursor-pointer bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[560px] rounded-t-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 pb-8 shadow-[var(--shadow)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {title ?? "Aksi"}
          </p>
          <IconButton type="button" onClick={onClose}>
            X
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}
