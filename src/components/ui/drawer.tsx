"use client";

import type { ReactNode } from "react";

import type { ModalCloseGuard, ModalHotkey } from "@/components/ui/modal-provider";
import { ResponsiveModal } from "@/components/ui/responsive-modal";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: "cyan" | "green" | "amber" | "slate";
  size?: "md" | "lg" | "xl";
  headerMeta?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  closeGuard?: ModalCloseGuard;
  hotkeys?: ModalHotkey[];
};

export function Drawer(props: DrawerProps) {
  return <ResponsiveModal {...props} desktopMode="drawer" />;
}
