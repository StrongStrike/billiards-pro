"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { CosmicStage } from "@/components/cosmic-stage";
import { LiveClock } from "@/components/live-clock";
import { Button } from "@/components/ui/button";
import { logoutRequest } from "@/lib/client/api";
import { navItems } from "@/lib/constants";
import { cn, formatDateTimeLabel } from "@/lib/utils";
import type { OperatorSession } from "@/types/club";

export function AdminShell({
  operator,
  clubName,
  timezone,
  generatedAt,
  children,
}: {
  operator: OperatorSession;
  clubName: string;
  timezone: string;
  generatedAt: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  async function logout() {
    await logoutRequest();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 xl:px-8">
      <CosmicStage />
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1820px] flex-col gap-4 xl:flex-row">
        <aside className="glass-panel soft-ring hud-frame flex w-full flex-row gap-2 rounded-[34px] p-3 xl:sticky xl:top-4 xl:min-h-[calc(100vh-2rem)] xl:w-[300px] xl:flex-col xl:p-5">
          <div className="sheen-surface hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-5 xl:block">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,rgba(39,230,245,0.34),rgba(45,255,138,0.18))] text-white shadow-[0_12px_28px_rgba(10,97,112,0.24)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">{clubName}</div>
                <div className="lux-title mt-1 font-display text-2xl font-bold">Billiards Pro</div>
              </div>
            </div>
            <div className="mt-4 text-sm leading-7 text-slate-400">
              Stollar, bar, bronlar va hisobotlar yagona nazorat markazida.
            </div>
            <div className="lux-subtle mt-5 h-px w-full" />
            <div className="mt-5 grid gap-3">
              <div className="rounded-[22px] border border-cyan-300/14 bg-cyan-300/8 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cyan-100/75">
                  <ShieldCheck className="h-4 w-4" />
                  Tizim holati
                </div>
                <div className="mt-2 font-semibold text-white">API onlayn, sessiya himoyalangan</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Oxirgi yangilanish</div>
                <div className="mt-2 font-medium text-white">{formatDateTimeLabel(generatedAt, timezone)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Zona</div>
                  <div className="mt-2 font-display text-lg font-semibold text-white">{timezone}</div>
                </div>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Kirish</div>
                  <div className="mt-2 inline-flex items-center gap-2 font-medium text-white">
                    <span className="signal-dot signal-dot--green" />
                    Himoyalangan
                  </div>
                </div>
              </div>
            </div>
          </div>
          <nav className="flex min-w-0 flex-1 gap-2 overflow-x-auto xl:flex-col xl:overflow-visible">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex min-w-[172px] items-center gap-3 rounded-[24px] border px-4 py-3.5 transition xl:min-w-0",
                    active
                      ? "border-cyan-300/34 text-white shadow-[0_0_30px_rgba(39,230,245,0.12)]"
                      : "border-white/6 bg-white/[0.025] text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="nav-active-shell"
                      className="absolute inset-0 rounded-[24px] bg-[linear-gradient(135deg,rgba(39,230,245,0.14),rgba(39,230,245,0.05))]"
                      transition={{ type: "spring", stiffness: 280, damping: 26 }}
                    />
                  ) : null}
                  <span
                    className={cn(
                      "relative rounded-2xl p-2.5 transition",
                      active ? "bg-cyan-300/12 text-cyan-200" : "bg-white/5 text-slate-300 group-hover:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="relative flex min-w-0 items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold">{item.label}</span>
                    {active ? <div className="h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_16px_rgba(39,230,245,0.6)]" /> : null}
                  </div>
                </Link>
              );
            })}
          </nav>
          <div className="sheen-surface hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.015))] p-5 xl:block">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Operator</div>
                <div className="mt-3 font-display text-xl font-semibold text-white">{operator.name}</div>
              </div>
              <div className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-200">
                Faol
              </div>
            </div>
            <div className="mt-1 text-sm text-slate-400">{operator.email}</div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-cyan-200">
              <Activity className="h-3.5 w-3.5" />
              PostgreSQL kirish
            </div>
            <Button variant="secondary" className="mt-5 w-full justify-center gap-2" onClick={logout} size="lg">
              <LogOut className="h-4 w-4" />
              Chiqish
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <motion.header
            className="glass-panel soft-ring hud-frame relative overflow-hidden rounded-[34px] px-6 py-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(39,230,245,0.14),transparent_56%)]" />
            <motion.div
              className="pointer-events-none absolute -right-20 top-8 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(39,230,245,0.22),transparent_72%)] blur-3xl"
              animate={{ x: [0, -26, 0], y: [0, 18, 0], opacity: [0.24, 0.42, 0.24] }}
              transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(39,230,245,0.6),transparent)]" />
            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              <div className="max-w-3xl">
                <div className="eyebrow-pill">Klub boshqaruvi</div>
                <h1 className="lux-title mt-5 font-display text-3xl font-bold tracking-[-0.04em] md:text-[2.85rem]">
                  Billiard nazorat paneli
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  Rus billiard zali uchun professional ichki panel: stol nazorati, buyurtmalar, bron,
                  hisobot va ombor boshqaruvi.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="data-chip">
                    <span className="signal-dot" />
                    Jonli nazorat
                  </div>
                  <div className="data-chip">
                    <span className="signal-dot signal-dot--green" />
                    Stol va bar oqimi
                  </div>
                  <div className="data-chip">
                    <span className="signal-dot signal-dot--amber" />
                    Bron va hisobot
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start">
                <LiveClock timezone={timezone} />
                <div className="rounded-[30px] border border-white/8 bg-white/[0.04] px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.14)]">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Navbatchi operator</div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(39,230,245,0.35),rgba(45,255,138,0.22))] font-display text-lg font-bold text-white">
                      {operator.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{operator.name}</div>
                      <div className="text-sm text-slate-400">{operator.email}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
