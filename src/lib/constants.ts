import {
  ChartSpline,
  ClipboardList,
  Cog,
  LayoutDashboard,
  Martini,
  Package2,
  Table2,
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Boshqaruv paneli", icon: LayoutDashboard },
  { href: "/stollar", label: "Stollar", icon: Table2 },
  { href: "/buyurtmalar", label: "Buyurtmalar", icon: Martini },
  { href: "/bronlar", label: "Bronlar", icon: ClipboardList },
  { href: "/hisobotlar", label: "Hisobotlar", icon: ChartSpline },
  { href: "/ombor", label: "Ombor", icon: Package2 },
  { href: "/sozlamalar", label: "Sozlamalar", icon: Cog },
] as const;

export const tableStatusCopy = {
  free: { label: "Bo'sh", className: "text-slate-300 bg-white/8 ring-white/10" },
  active: { label: "Band", className: "text-[#2DFF8A] bg-[#2DFF8A]/10 ring-[#2DFF8A]/40" },
  reserved: { label: "Bron", className: "text-[#F4C34E] bg-[#F4C34E]/10 ring-[#F4C34E]/40" },
} as const;
