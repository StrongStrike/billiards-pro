"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { LiveClock } from "@/components/live-clock";
import { Button } from "@/components/ui/button";
import { logoutRequest } from "@/lib/client/api";
import { navItems } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OperatorSession } from "@/types/club";

export function AdminShell({
  operator,
  clubName,
  timezone,
  children,
}: {
  operator: OperatorSession;
  clubName: string;
  timezone: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  async function logout() {
    await logoutRequest();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen px-4 py-4 md:px-6 xl:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1800px] flex-col gap-4 xl:flex-row">
        <aside className="glass-panel soft-ring flex w-full flex-row gap-2 rounded-[30px] p-3 xl:min-h-full xl:w-72 xl:flex-col xl:p-5">
          <div className="hidden rounded-[24px] border border-white/8 bg-white/3 p-4 xl:block">
            <div className="text-xs uppercase tracking-[0.24em] text-cyan-300/80">{clubName}</div>
            <div className="mt-3 font-display text-2xl font-bold text-white">Rus billiard nazorati</div>
            <div className="mt-2 text-sm text-slate-400">Stollar, bar, bronlar va hisobotlar bir panelda</div>
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
                    "group flex min-w-[168px] items-center gap-3 rounded-[22px] border px-4 py-3 transition xl:min-w-0",
                    active
                      ? "border-cyan-300/40 bg-cyan-300/10 text-white shadow-[0_0_24px_rgba(39,230,245,0.18)]"
                      : "border-white/6 bg-white/[0.03] text-slate-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "rounded-2xl p-2",
                      active ? "bg-cyan-300/12 text-cyan-200" : "bg-white/5 text-slate-300",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="hidden rounded-[24px] border border-white/8 bg-white/3 p-4 xl:block">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Operator</div>
            <div className="mt-3 font-display text-xl font-semibold text-white">{operator.name}</div>
            <div className="mt-1 text-sm text-slate-400">{operator.email}</div>
            <div className="mt-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
              PostgreSQL kirish
            </div>
            <Button variant="secondary" className="mt-5 w-full justify-center gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Chiqish
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="glass-panel soft-ring flex flex-col justify-between gap-4 rounded-[30px] px-6 py-5 lg:flex-row lg:items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-cyan-300/70">Klub boshqaruvi</div>
              <h1 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">
                Billiard nazorat paneli
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Rus billiard zali uchun professional ichki panel: stol nazorati, buyurtmalar, bron,
                hisobot va ombor boshqaruvi.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <LiveClock timezone={timezone} />
              <div className="rounded-[26px] border border-white/8 bg-white/[0.04] px-5 py-4">
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
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
