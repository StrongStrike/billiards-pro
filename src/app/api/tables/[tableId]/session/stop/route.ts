import { stopTableSession } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";
import { stopSessionSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  context: { params: Promise<{ tableId: string }> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = stopSessionSchema.parse(await request.json());
    const { tableId } = await context.params;
    await stopTableSession(tableId, payload);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
