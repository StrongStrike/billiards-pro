import { getCurrentShift } from "@/lib/server/club-service";
import { ok, requireApiRole } from "@/lib/server/api";

export async function GET() {
  const access = await requireApiRole(["admin", "cashier"]);
  if (access.response) {
    return access.response;
  }

  return ok({ shift: await getCurrentShift() });
}
