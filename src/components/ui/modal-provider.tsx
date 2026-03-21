"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type ModalCloseReason = "button" | "overlay" | "escape";

export type ModalCloseGuard = {
  when: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
};

export type ModalHotkey = {
  key: string;
  label: string;
  action: () => void;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  ctrlOrMeta?: boolean;
  preventDefault?: boolean;
  allowInInput?: boolean;
};

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastRecord = ToastInput & {
  id: string;
  tone: ToastTone;
  duration: number;
};

type ModalLayerState = {
  id: string;
  closeOnEscape: boolean;
  closeOnOverlay: boolean;
  closeGuard?: ModalCloseGuard;
};

type ModalLayerRuntime = {
  onClose: () => void;
  closeGuard?: ModalCloseGuard;
  hotkeys?: ModalHotkey[];
};

type ModalLayerRegistration = {
  id: string;
  onClose: () => void;
  closeOnEscape: boolean;
  closeOnOverlay: boolean;
  closeGuard?: ModalCloseGuard;
  hotkeys?: ModalHotkey[];
};

type PendingClosePrompt = {
  layerId: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

type ModalSystemContextValue = {
  pushToast: (toast: ToastInput) => void;
  registerLayer: (layer: ModalLayerRegistration) => void;
  updateLayer: (layerId: string, patch: Partial<ModalLayerRegistration>) => void;
  unregisterLayer: (layerId: string) => void;
  requestClose: (layerId: string, reason?: ModalCloseReason) => void;
  requestTopLayerClose: (reason?: ModalCloseReason) => void;
  isTopLayer: (layerId: string) => boolean;
  getLayerIndex: (layerId: string) => number;
};

const ModalSystemContext = createContext<ModalSystemContextValue | null>(null);

const toastStyles: Record<ToastTone, string> = {
  success: "border-emerald-300/18 bg-emerald-400/12 text-emerald-50",
  error: "border-rose-300/18 bg-rose-500/12 text-rose-50",
  info: "border-cyan-300/18 bg-cyan-300/12 text-cyan-50",
};

function toastIcon(tone: ToastTone) {
  if (tone === "success") {
    return <CheckCircle2 className="h-5 w-5" />;
  }
  if (tone === "error") {
    return <CircleAlert className="h-5 w-5" />;
  }
  return <Info className="h-5 w-5" />;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    Boolean(target.closest("[contenteditable='true']"))
  );
}

function hotkeyMatches(event: KeyboardEvent, hotkey: ModalHotkey) {
  const eventKey = event.key.toLowerCase();
  const hotkeyKey = hotkey.key.toLowerCase();

  if (eventKey !== hotkeyKey) {
    return false;
  }

  if (hotkey.ctrlOrMeta) {
    if (!(event.ctrlKey || event.metaKey)) {
      return false;
    }
  } else {
    if (Boolean(hotkey.ctrl) !== event.ctrlKey) {
      return false;
    }
    if (Boolean(hotkey.meta) !== event.metaKey) {
      return false;
    }
  }

  if (Boolean(hotkey.shift) !== event.shiftKey) {
    return false;
  }

  if (Boolean(hotkey.alt) !== event.altKey) {
    return false;
  }

  return true;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [layers, setLayers] = useState<ModalLayerState[]>([]);
  const [closePrompt, setClosePrompt] = useState<PendingClosePrompt | null>(null);
  const timeoutsRef = useRef<Map<string, number>>(new Map());
  const layersRef = useRef<ModalLayerState[]>([]);
  const layerRuntimeRef = useRef<Map<string, ModalLayerRuntime>>(new Map());

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    ({ title, description, tone = "info", duration = 3200 }: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, title, description, tone, duration }]);
      const timeoutId = window.setTimeout(() => removeToast(id), duration);
      timeoutsRef.current.set(id, timeoutId);
    },
    [removeToast],
  );

  const registerLayer = useCallback((layer: ModalLayerRegistration) => {
    layerRuntimeRef.current.set(layer.id, {
      onClose: layer.onClose,
      closeGuard: layer.closeGuard,
      hotkeys: layer.hotkeys,
    });

    setLayers((current) => {
      const nextState: ModalLayerState = {
        id: layer.id,
        closeOnEscape: layer.closeOnEscape,
        closeOnOverlay: layer.closeOnOverlay,
        closeGuard: layer.closeGuard,
      };
      const existingIndex = current.findIndex((item) => item.id === layer.id);
      if (existingIndex >= 0) {
        const next = [...current];
        const existing = next[existingIndex];
        if (
          existing.closeOnEscape === nextState.closeOnEscape &&
          existing.closeOnOverlay === nextState.closeOnOverlay &&
          existing.closeGuard?.when === nextState.closeGuard?.when &&
          existing.closeGuard?.title === nextState.closeGuard?.title &&
          existing.closeGuard?.description === nextState.closeGuard?.description &&
          existing.closeGuard?.confirmLabel === nextState.closeGuard?.confirmLabel
        ) {
          return current;
        }
        next[existingIndex] = nextState;
        return next;
      }
      return [...current, nextState];
    });
  }, []);

  const updateLayer = useCallback((layerId: string, patch: Partial<ModalLayerRegistration>) => {
    const runtime = layerRuntimeRef.current.get(layerId);
    if (runtime) {
      layerRuntimeRef.current.set(layerId, {
        onClose: patch.onClose ?? runtime.onClose,
        closeGuard: patch.closeGuard ?? runtime.closeGuard,
        hotkeys: patch.hotkeys ?? runtime.hotkeys,
      });
    }

    setLayers((current) => {
      let changed = false;
      const next = current.map((item) => {
        if (item.id !== layerId) {
          return item;
        }

        const nextState: ModalLayerState = {
          id: item.id,
          closeOnEscape: patch.closeOnEscape ?? item.closeOnEscape,
          closeOnOverlay: patch.closeOnOverlay ?? item.closeOnOverlay,
          closeGuard: patch.closeGuard ?? item.closeGuard,
        };

        if (
          item.closeOnEscape === nextState.closeOnEscape &&
          item.closeOnOverlay === nextState.closeOnOverlay &&
          item.closeGuard?.when === nextState.closeGuard?.when &&
          item.closeGuard?.title === nextState.closeGuard?.title &&
          item.closeGuard?.description === nextState.closeGuard?.description &&
          item.closeGuard?.confirmLabel === nextState.closeGuard?.confirmLabel
        ) {
          return item;
        }

        changed = true;
        return nextState;
      });

      return changed ? next : current;
    });
  }, []);

  const unregisterLayer = useCallback((layerId: string) => {
    setLayers((current) => current.filter((item) => item.id !== layerId));
    layerRuntimeRef.current.delete(layerId);
    setClosePrompt((current) => (current?.layerId === layerId ? null : current));
  }, []);

  const isTopLayer = useCallback((layerId: string) => {
    const current = layersRef.current;
    return current.length > 0 && current[current.length - 1]?.id === layerId;
  }, []);

  const getLayerIndex = useCallback((layerId: string) => {
    return layers.findIndex((item) => item.id === layerId);
  }, [layers]);

  const requestClose = useCallback((layerId: string, reason: ModalCloseReason = "button") => {
    const current = layersRef.current;
    if (current.length === 0 || current[current.length - 1]?.id !== layerId) {
      return;
    }

    const layer = current[current.length - 1];
    const runtime = layerRuntimeRef.current.get(layerId);
    if (!layer || !runtime) {
      return;
    }

    if (reason === "overlay" && !layer.closeOnOverlay) {
      return;
    }

    if (reason === "escape" && !layer.closeOnEscape) {
      return;
    }

    if (runtime.closeGuard?.when) {
      setClosePrompt({
        layerId,
        title: runtime.closeGuard.title ?? "Saqlanmagan o'zgarishlar bor",
        description:
          runtime.closeGuard.description ??
          "Modal ichidagi o'zgarishlar hali saqlanmagan. Yopilsa ular yo'qoladi.",
        confirmLabel: runtime.closeGuard.confirmLabel ?? "Baribir yopish",
        onConfirm: runtime.onClose,
      });
      return;
    }

    runtime.onClose();
  }, []);

  const requestTopLayerClose = useCallback((reason: ModalCloseReason = "button") => {
    const topLayer = layersRef.current[layersRef.current.length - 1];
    if (!topLayer) {
      return;
    }

    requestClose(topLayer.id, reason);
  }, [requestClose]);

  useEffect(() => {
    const timeoutMap = timeoutsRef.current;
    return () => {
      for (const timeoutId of timeoutMap.values()) {
        window.clearTimeout(timeoutId);
      }
      timeoutMap.clear();
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    if (layers.length > 0 || closePrompt) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      return () => {
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPaddingRight;
      };
    }

    return undefined;
  }, [layers.length, closePrompt]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (closePrompt) {
        if (event.key === "Escape") {
          event.preventDefault();
          setClosePrompt(null);
        }
        return;
      }

      const topLayer = layersRef.current[layersRef.current.length - 1];
      if (!topLayer) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        requestClose(topLayer.id, "escape");
        return;
      }

      const runtime = layerRuntimeRef.current.get(topLayer.id);
      if (!runtime?.hotkeys?.length) {
        return;
      }

      for (const hotkey of runtime.hotkeys) {
        if (!hotkey.allowInInput && isEditableTarget(event.target)) {
          continue;
        }

        if (!hotkeyMatches(event, hotkey)) {
          continue;
        }

        if (hotkey.preventDefault !== false) {
          event.preventDefault();
        }
        hotkey.action();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePrompt, requestClose]);

  const value = useMemo<ModalSystemContextValue>(
    () => ({
      pushToast,
      registerLayer,
      updateLayer,
      unregisterLayer,
      requestClose,
      requestTopLayerClose,
      isTopLayer,
      getLayerIndex,
    }),
    [getLayerIndex, isTopLayer, pushToast, registerLayer, requestClose, requestTopLayerClose, unregisterLayer, updateLayer],
  );

  return (
    <ModalSystemContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-4 top-4 z-[140] flex flex-col items-end gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-[24px] border px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-[10px]",
              toastStyles[toast.tone],
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{toastIcon(toast.tone)}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white">{toast.title}</div>
                {toast.description ? (
                  <div className="mt-1 text-sm leading-6 text-white/80">{toast.description}</div>
                ) : null}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                onClick={() => removeToast(toast.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {closePrompt ? (
        <div className="fixed inset-0 z-[160]">
          <button
            type="button"
            aria-label="Saqlanmagan o'zgarishlar oynasini yopish"
            className="absolute inset-0 bg-[rgba(2,6,12,0.82)]"
            onClick={() => setClosePrompt(null)}
          />
          <div className="absolute inset-0 flex items-end justify-stretch px-0 py-0 md:items-center md:justify-center md:px-4 md:py-4">
            <div className="relative w-full rounded-t-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,29,0.98),rgba(7,13,21,0.98))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.42)] md:max-w-[560px] md:rounded-[34px] md:p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-amber-300/24 bg-amber-400/14 text-amber-100">
                  <TriangleAlert className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-2xl font-bold text-white">{closePrompt.title}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-400">{closePrompt.description}</div>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                Yopilsa joriy modal ichidagi o&#39;zgarishlar bekor bo&#39;ladi.
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" onClick={() => setClosePrompt(null)}>
                  Qaytish
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    const onConfirm = closePrompt.onConfirm;
                    setClosePrompt(null);
                    onConfirm();
                  }}
                >
                  {closePrompt.confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ModalSystemContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ModalSystemContext);
  if (!context) {
    throw new Error("useToast must be used inside ModalProvider");
  }

  return { pushToast: context.pushToast };
}

export function useModalSystem() {
  const context = useContext(ModalSystemContext);
  if (!context) {
    throw new Error("useModalSystem must be used inside ModalProvider");
  }

  return context;
}

export function useModalDismiss() {
  const context = useContext(ModalSystemContext);
  if (!context) {
    throw new Error("useModalDismiss must be used inside ModalProvider");
  }

  return () => context.requestTopLayerClose("button");
}
