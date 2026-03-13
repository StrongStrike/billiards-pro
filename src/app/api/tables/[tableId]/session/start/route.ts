import { startTableSession } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";
import { startSessionSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  context: { params: Promise<{ tableId: string }> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = startSessionSchema.parse(await request.json());
    const { tableId } = await context.params;
    await startTableSession(tableId, payload);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
