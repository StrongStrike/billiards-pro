import type { ReportRange } from "@/types/club";

import { getReport } from "@/lib/server/club-service";
import { ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";

export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const value = searchParams.get("range");
  const range: ReportRange =
    value === "month" || value === "year" || value === "day" ? value : "day";

  return ok(await getReport(range));
}
