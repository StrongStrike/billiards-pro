"use client";

import Link from "next/link";
import { Activity, CalendarClock, Gamepad2, Martini, WalletCards } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Panel } from "@/components/ui/panel";
import { useBootstrapQuery, useDashboardActivityQuery } from "@/lib/hooks/use-club-data";
import { formatClock, formatCurrency } from "@/lib/utils";
import { MetricCard, SectionHeader, TableCard } from "@/features/shared";

export function DashboardPage() {
  const bootstrapQuery = useBootstrapQuery();
  const activityQuery = useDashboardActivityQuery();

  if (bootstrapQuery.isPending || !bootstrapQuery.data) {
    return <Panel className="min-h-[60vh] animate-pulse bg-white/5" />;
  }

  const { tables, reservations, kpis, settings } = bootstrapQuery.data;
  const activity = activityQuery.data ?? [];

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Boshqaruv paneli"
        title="Jonli klub kuzatuvi"
        description="Markazda stol grid, o'ng tomonda klub dinamikasi va bugungi operatsion ko'rsatkichlar."
        action={
          <div className="flex flex-wrap gap-3">
            <Link href="/stollar" className="text-sm text-cyan-200 hover:text-cyan-100">
              Stollarni boshqarish
            </Link>
            <Link href="/buyurtmalar" className="text-sm text-slate-300 hover:text-white">
              Bar buyurtmalari
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Bugungi tushum" value={formatCurrency(kpis.totalRevenue, settings.currency)} accent="cyan" />
        <MetricCard label="Band stollar" value={`${kpis.activeTables} / ${tables.length}`} accent="green" />
        <MetricCard label="Bronlar" value={String(kpis.reservationsToday)} accent="amber" />
        <MetricCard label="Bar savdosi" value={formatCurrency(kpis.barRevenue, settings.currency)} accent="slate" />
      </div>

      <div className={settings.showRightRail ? "dashboard-grid" : "space-y-4"}>
        <div className="space-y-4">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.26em] text-cyan-300/70">Stol statusi</div>
                <div className="mt-2 font-display text-2xl font-bold text-white">7 ta rus billiard stoli</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
                15 soniyada yangilanadi
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {tables.map((table) => (
                <TableCard
                  key={table.id}
                  table={table}
                  currency={settings.currency}
                  timezone={settings.timezone}
                  compact
                />
              ))}
            </div>
          </Panel>
        </div>

        {settings.showRightRail ? (
          <div className="space-y-4">
            {settings.showActivityChart ? (
              <Panel className="min-h-[340px]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.26em] text-cyan-300/70">Klub dinamikasi</div>
                    <div className="mt-2 font-display text-2xl font-bold text-white">Yuklama grafigi</div>
                  </div>
                  <Activity className="h-6 w-6 text-cyan-200" />
                </div>
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activity}>
                      <defs>
                        <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#27E6F5" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#27E6F5" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#7e8ea6" tickLine={false} axisLine={false} />
                      <YAxis stroke="#7e8ea6" tickLine={false} axisLine={false} width={34} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(10,18,29,0.96)",
                          border: "1px solid rgba(39,230,245,0.18)",
                          borderRadius: "16px",
                        }}
                      />
                      <Area type="monotone" dataKey="occupancy" stroke="#27E6F5" fill="url(#dashFill)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            ) : null}

            <Panel>
              <div className="flex items-center justify-between">
                <div className="font-display text-2xl font-bold text-white">Yaqin bronlar</div>
                <CalendarClock className="h-5 w-5 text-amber-200" />
              </div>
              <div className="mt-5 space-y-3">
                {reservations
                  .filter((reservation) => reservation.status === "scheduled")
                  .slice(0, 4)
                  .map((reservation) => (
                    <div
                      key={reservation.id}
                      className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white">{reservation.customerName}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {reservation.tableId.replace("table-", "Stol ")} | {reservation.guests} kishi
                          </div>
                        </div>
                        <div className="font-display text-2xl font-bold text-amber-200">
                          {formatClock(reservation.startAt, settings.timezone)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Panel>

            <Panel>
              <div className="font-display text-2xl font-bold text-white">Bugungi kesim</div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "O'yin",
                    value: String(kpis.gamesToday),
                    icon: Gamepad2,
                    color: "text-cyan-200",
                  },
                  {
                    label: "Bar tushumi",
                    value: formatCurrency(kpis.barRevenue, settings.currency),
                    icon: Martini,
                    color: "text-emerald-200",
                  },
                  {
                    label: "Bandlik",
                    value: `${kpis.occupancyRate}%`,
                    icon: Activity,
                    color: "text-amber-200",
                  },
                  {
                    label: "Jami tushum",
                    value: formatCurrency(kpis.totalRevenue, settings.currency),
                    icon: WalletCards,
                    color: "text-white",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-white/8 bg-white/[0.04] p-4">
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                    <div className="mt-4 text-sm text-slate-400">{item.label}</div>
                    <div className={`mt-2 font-display text-2xl font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}
      </div>
    </div>
  );
}
