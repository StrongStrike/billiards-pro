"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useModalDismiss, type ModalCloseGuard } from "@/components/ui/modal-provider";
import { ResponsiveModal } from "@/components/ui/responsive-modal";

type WizardModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  steps: string[];
  currentStep: number;
  onPrev?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  prevLabel?: string;
  canGoNext?: boolean;
  canGoPrev?: boolean;
  pending?: boolean;
  closeGuard?: ModalCloseGuard;
  children: ReactNode;
};

export function WizardModal({
  open,
  onClose,
  title,
  description,
  steps,
  currentStep,
  onPrev,
  onNext,
  nextLabel = "Keyingi qadam",
  prevLabel = "Orqaga",
  canGoNext = true,
  canGoPrev = true,
  pending = false,
  closeGuard,
  children,
}: WizardModalProps) {
  const requestTopLayerClose = useModalDismiss();

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      tone="cyan"
      size="lg"
      icon={<Sparkles className="h-5 w-5" />}
      closeGuard={closeGuard}
      hotkeys={[
        ...(onPrev
          ? [
              {
                key: "ArrowLeft",
                alt: true,
                label: "Oldingi bosqich",
                action: onPrev,
              },
            ]
          : []),
        ...(onNext
          ? [
              {
                key: "ArrowRight",
                alt: true,
                label: "Keyingi bosqich",
                action: onNext,
              },
            ]
          : []),
      ]}
      headerMeta={
        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`data-chip ${index === currentStep ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-100" : ""}`}
            >
              {index + 1}. {step}
            </div>
          ))}
        </div>
      }
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="secondary" onClick={requestTopLayerClose} disabled={pending}>
            Yopish
          </Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {onPrev ? (
              <Button variant="ghost" className="gap-2" onClick={onPrev} disabled={pending || !canGoPrev}>
                <ChevronLeft className="h-4 w-4" />
                {prevLabel}
              </Button>
            ) : null}
            {onNext ? (
              <Button className="gap-2" onClick={onNext} disabled={pending || !canGoNext}>
                {nextLabel}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      {children}
    </ResponsiveModal>
  );
}
