"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import type { DashboardActivityPoint } from "@/types/club";

export function DashboardActivityChart({ data }: { data: DashboardActivityPoint[] }) {
  return (
    <ChartFrame height={256}>
      {({ width, height }) => (
        <AreaChart width={width} height={height} data={data}>
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
      )}
    </ChartFrame>
  );
}
