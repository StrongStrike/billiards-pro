"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ModalNote, ResponsiveModal } from "@/components/ui/responsive-modal";

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  pending?: boolean;
  tone?: "cyan" | "green" | "amber" | "slate";
  stats?: ReactNode;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmVariant = "primary",
  pending = false,
  tone = "amber",
  stats,
}: ConfirmModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      tone={tone}
      size="md"
      icon={<AlertTriangle className="h-5 w-5" />}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" className="sm:min-w-36" onClick={onClose} disabled={pending}>
            Bekor qilish
          </Button>
          <Button variant={confirmVariant} className="sm:min-w-44" onClick={onConfirm} disabled={pending}>
            {pending ? "Bajarilmoqda..." : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <ModalNote tone={tone === "slate" ? "slate" : tone}>
          Bu amal bajarilgach ma&#39;lumotlar darhol yangilanadi va operator panelidagi holat qayta hisoblanadi.
        </ModalNote>
        {stats}
      </div>
    </ResponsiveModal>
  );
}
