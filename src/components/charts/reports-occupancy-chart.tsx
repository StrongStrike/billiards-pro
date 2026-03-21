"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { ChartFrame } from "@/components/charts/chart-frame";
import type { RangeReport } from "@/types/club";

export function ReportsOccupancyChart({ data }: { data: RangeReport["chart"] }) {
  return (
    <ChartFrame height={288}>
      {({ width, height }) => (
        <BarChart width={width} height={height} data={data}>
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
          <Bar dataKey="occupancy" name="Bandlik %" fill="#27E6F5" radius={[8, 8, 0, 0]} />
        </BarChart>
      )}
    </ChartFrame>
  );
}
