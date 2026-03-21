"use client";

import { useQuery } from "@tanstack/react-query";

import { requestJson } from "@/lib/client/api";
import type { BootstrapPayload, DashboardActivityPoint, RangeReport, ReportRange } from "@/types/club";

export function useBootstrapQuery() {
  return useQuery({
    queryKey: ["bootstrap"],
    queryFn: () => requestJson<BootstrapPayload>("/api/bootstrap"),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchInterval: 30_000,
  });
}

export function useDashboardActivityQuery() {
  return useQuery({
    queryKey: ["dashboard", "activity"],
    queryFn: () => requestJson<DashboardActivityPoint[]>("/api/dashboard/activity"),
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchInterval: 30_000,
  });
}

export function useReportsQuery(range: ReportRange) {
  return useQuery({
    queryKey: ["reports", range],
    queryFn: () => requestJson<RangeReport>(`/api/reports?range=${range}`),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}
