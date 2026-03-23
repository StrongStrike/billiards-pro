import {
  ChartSpline,
  ClipboardList,
  Cog,
  LayoutDashboard,
  Martini,
  Package2,
  Table2,
} from "lucide-react";

import type { OperatorRole } from "@/types/club";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: OperatorRole[];
};

export const navItems: readonly NavItem[] = [
  { href: "/dashboard", label: "Boshqaruv paneli", icon: LayoutDashboard, roles: ["admin", "cashier"] },
  { href: "/stollar", label: "Stollar", icon: Table2, roles: ["admin", "cashier"] },
  { href: "/buyurtmalar", label: "Buyurtmalar", icon: Martini, roles: ["admin", "cashier"] },
  { href: "/bronlar", label: "Bronlar", icon: ClipboardList, roles: ["admin", "cashier"] },
  { href: "/hisobotlar", label: "Hisobotlar", icon: ChartSpline, roles: ["admin"] },
  { href: "/ombor", label: "Ombor", icon: Package2, roles: ["admin"] },
  { href: "/sozlamalar", label: "Sozlamalar", icon: Cog, roles: ["admin"] },
] as const;

export const tableStatusCopy = {
  free: { label: "Bo'sh", className: "text-slate-300 bg-white/8 ring-white/10" },
  active: { label: "Band", className: "text-[#2DFF8A] bg-[#2DFF8A]/10 ring-[#2DFF8A]/40" },
  reserved: { label: "Bron", className: "text-[#F4C34E] bg-[#F4C34E]/10 ring-[#F4C34E]/40" },
} as const;

export const reservationStatusCopy = {
  scheduled: { label: "Rejada", className: "text-[#F4C34E] bg-[#F4C34E]/10 ring-[#F4C34E]/40" },
  arrived: { label: "Keldi", className: "text-[#2DFF8A] bg-[#2DFF8A]/10 ring-[#2DFF8A]/40" },
  completed: { label: "Yakunlandi", className: "text-cyan-200 bg-cyan-300/10 ring-cyan-300/30" },
  cancelled: { label: "Bekor", className: "text-slate-300 bg-white/8 ring-white/10" },
} as const;
