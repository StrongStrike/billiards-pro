import { getBootstrapPayload } from "@/lib/server/club-service";
import { ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";

export async function GET() {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const payload = await getBootstrapPayload(session);
  return ok(payload.tables);
}
