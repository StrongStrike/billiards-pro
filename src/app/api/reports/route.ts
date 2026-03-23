import type { ReportRange } from "@/types/club";

import { getReport } from "@/lib/server/club-service";
import { ok, requireApiRole } from "@/lib/server/api";

export async function GET(request: Request) {
  const access = await requireApiRole(["admin"]);
  if (access.response) {
    return access.response;
  }

  const { searchParams } = new URL(request.url);
  const value = searchParams.get("range");
  const range: ReportRange =
    value === "month" || value === "year" || value === "day" || value === "week" ? value : "day";

  return ok(await getReport(range));
}
