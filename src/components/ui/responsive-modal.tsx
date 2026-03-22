"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { ModalDismissProvider } from "@/components/ui/modal-provider";
import type { ModalCloseGuard, ModalHotkey } from "@/components/ui/modal-provider";
import { useModalSystem } from "@/components/ui/modal-provider";
import { cn } from "@/lib/utils";

type ModalTone = "cyan" | "green" | "amber" | "slate";
type ModalSize = "md" | "lg" | "xl";
type DesktopMode = "dialog" | "drawer";

const toneClasses: Record<ModalTone, string> = {
  cyan: "before:bg-[radial-gradient(circle_at_top_right,rgba(39,230,245,0.2),transparent_38%)]",
  green: "before:bg-[radial-gradient(circle_at_top_right,rgba(45,255,138,0.18),transparent_38%)]",
  amber: "before:bg-[radial-gradient(circle_at_top_right,rgba(244,195,78,0.2),transparent_38%)]",
  slate: "before:bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,0.18),transparent_38%)]",
};

const iconToneClasses: Record<ModalTone, string> = {
  cyan: "border-cyan-300/24 bg-cyan-300/12 text-cyan-100",
  green: "border-emerald-300/24 bg-emerald-400/12 text-emerald-100",
  amber: "border-amber-300/24 bg-amber-400/14 text-amber-100",
  slate: "border-white/10 bg-white/[0.06] text-slate-100",
};

const sizeClasses: Record<ModalSize, string> = {
  md: "xl:max-w-[640px]",
  lg: "xl:max-w-[780px]",
  xl: "xl:max-w-[980px]",
};

type ResponsiveModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: ModalTone;
  size?: ModalSize;
  desktopMode?: DesktopMode;
  headerMeta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  closeGuard?: ModalCloseGuard;
  hotkeys?: ModalHotkey[];
};

export function ResponsiveModal({
  open,
  onClose,
  title,
  description,
  icon,
  tone = "cyan",
  size = "lg",
  desktopMode = "dialog",
  headerMeta,
  footer,
  children,
  closeOnOverlay = true,
  closeOnEscape = true,
  closeGuard,
  hotkeys,
}: ResponsiveModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const layerId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const latestLayerRef = useRef({
    onClose,
    closeOnEscape,
    closeOnOverlay,
    closeGuard,
    hotkeys,
  });
  const {
    registerLayer,
    updateLayer,
    unregisterLayer,
    requestClose,
    isTopLayer,
    getLayerIndex,
  } = useModalSystem();

  useEffect(() => {
    latestLayerRef.current = {
      onClose,
      closeOnEscape,
      closeOnOverlay,
      closeGuard,
      hotkeys,
    };
  }, [closeGuard, closeOnEscape, closeOnOverlay, hotkeys, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    registerLayer({
      id: layerId,
      ...latestLayerRef.current,
    });

    return () => unregisterLayer(layerId);
  }, [layerId, open, registerLayer, unregisterLayer]);

  useEffect(() => {
    if (!open) {
      return;
    }

    updateLayer(layerId, {
      onClose,
      closeOnEscape,
      closeOnOverlay,
      closeGuard,
      hotkeys,
    });
  }, [closeGuard, closeOnEscape, closeOnOverlay, hotkeys, layerId, onClose, open, updateLayer]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusFirstElement = () => {
      const dialog = dialogRef.current;
      if (!dialog || !isTopLayer(layerId)) {
        return;
      }

      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      focusables[0]?.focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !isTopLayer(layerId)) {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const focusTimer = window.setTimeout(focusFirstElement, 0);

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [isTopLayer, layerId, open]);

  if (typeof document === "undefined" || !open) {
    return null;
  }

  const layerIndex = Math.max(0, getLayerIndex(layerId));
  const baseZIndex = 120 + layerIndex * 4;
  const dismissCurrentLayer = () => requestClose(layerId, "button");

  return createPortal(
    <ModalDismissProvider dismiss={dismissCurrentLayer}>
      <div data-modal-root="true" className="fixed inset-0" style={{ zIndex: baseZIndex }}>
        <button
          type="button"
          aria-label="Modal oynani yopish"
          className="absolute inset-0 bg-[rgba(2,6,12,0.82)] backdrop-blur-[2px] transition-opacity duration-200"
          onClick={() => requestClose(layerId, "overlay")}
        />

        <div className="absolute inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-stretch px-0 py-0 md:items-stretch md:px-4 md:py-4 xl:items-center xl:justify-center xl:px-8 xl:py-10">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descriptionId : undefined}
              ref={dialogRef}
              tabIndex={-1}
              className={cn(
                "pointer-events-auto relative flex w-full flex-col overflow-hidden border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,29,0.98),rgba(7,13,21,0.98))] shadow-[0_28px_80px_rgba(0,0,0,0.42),0_0_0_1px_rgba(255,255,255,0.02)]",
                "max-h-[92dvh] rounded-t-[34px]",
                "before:pointer-events-none before:absolute before:inset-0 before:content-['']",
                "after:pointer-events-none after:absolute after:inset-x-6 after:top-0 after:h-px after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] after:content-['']",
                "md:ml-auto md:h-[calc(100dvh-2rem)] md:max-h-[calc(100dvh-2rem)] md:max-w-[620px] md:rounded-l-[34px] md:rounded-r-[0px] md:rounded-tl-[34px] md:rounded-tr-[0px] md:rounded-bl-[34px]",
                desktopMode === "dialog"
                  ? "xl:ml-0 xl:my-8 xl:h-auto xl:max-h-[calc(100dvh-5rem)] xl:rounded-[38px]"
                  : "xl:ml-auto xl:mr-0 xl:h-[calc(100dvh-3rem)] xl:max-h-[calc(100dvh-3rem)] xl:max-w-[620px] xl:rounded-l-[34px] xl:rounded-r-[0px] xl:rounded-tl-[34px] xl:rounded-tr-[0px] xl:rounded-bl-[34px]",
                toneClasses[tone],
                sizeClasses[size],
              )}
              style={{ zIndex: baseZIndex + 1 }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_18%,transparent_82%,rgba(255,255,255,0.02))]" />
              <div className="pointer-events-none absolute inset-[12px] rounded-[26px] border border-white/[0.045] md:rounded-[28px] xl:rounded-[30px]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[radial-gradient(circle_at_bottom,rgba(39,230,245,0.08),transparent_60%)]" />

              <div className="relative flex items-start justify-between gap-4 border-b border-white/8 px-5 pb-4 pt-5 md:px-6 md:pb-5 md:pt-6">
                <div className="flex min-w-0 items-start gap-4">
                  {icon ? (
                    <div
                      className={cn(
                        "mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                        iconToneClasses[tone],
                      )}
                    >
                      {icon}
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <h3 id={titleId} className="font-display text-2xl font-bold tracking-[-0.03em] text-white md:text-[2rem]">
                      {title}
                    </h3>
                    {description ? (
                      <p id={descriptionId} className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                        {description}
                      </p>
                    ) : null}
                    {headerMeta ? <div className="mt-4 flex flex-wrap gap-2">{headerMeta}</div> : null}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Modal oynani yopish"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
                  onClick={dismissCurrentLayer}
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6 md:py-6">{children}</div>

              {footer ? (
                <div className="relative border-t border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-5 py-4 md:px-6">
                  {footer}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ModalDismissProvider>,
    document.body,
  );
}

export function ModalStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.035] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 font-display text-2xl font-bold tracking-[-0.03em] text-white">{value}</div>
      {hint ? <div className="mt-2 text-sm text-slate-400">{hint}</div> : null}
    </div>
  );
}

export function ModalNote({
  tone = "slate",
  children,
}: {
  tone?: "cyan" | "green" | "amber" | "rose" | "slate";
  children: ReactNode;
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
      : tone === "amber"
        ? "border-amber-300/22 bg-amber-400/10 text-amber-100"
        : tone === "rose"
          ? "border-rose-300/22 bg-rose-500/10 text-rose-100"
          : tone === "cyan"
            ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100"
            : "border-white/10 bg-white/[0.04] text-slate-200";

  return <div className={cn("rounded-[22px] border px-4 py-3 text-sm leading-7", toneClass)}>{children}</div>;
}
