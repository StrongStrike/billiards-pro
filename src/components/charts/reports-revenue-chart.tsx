"use client";

import { CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import type { RangeReport } from "@/types/club";

export function ReportsRevenueChart({ data }: { data: RangeReport["chart"] }) {
  return (
    <ChartFrame height={288}>
      {({ width, height }) => (
        <LineChart width={width} height={height} data={data}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" stroke="#8293ab" tickLine={false} axisLine={false} />
          <YAxis stroke="#8293ab" tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "rgba(10,18,29,0.96)",
              border: "1px solid rgba(39,230,245,0.18)",
              borderRadius: "16px",
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="revenue" name="Tushum" stroke="#27E6F5" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="sessions" name="Seanslar" stroke="#2DFF8A" strokeWidth={3} dot={false} />
        </LineChart>
      )}
    </ChartFrame>
  );
}
