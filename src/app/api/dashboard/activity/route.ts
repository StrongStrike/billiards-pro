import { getDashboardActivity } from "@/lib/server/club-service";
import { ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";

export async function GET() {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  return ok(await getDashboardActivity());
}
