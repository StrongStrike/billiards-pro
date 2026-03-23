import { stopTableSession } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiRole } from "@/lib/server/api";
import { stopSessionSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  context: { params: Promise<{ tableId: string }> },
) {
  const access = await requireApiRole(["admin", "cashier"]);
  if (access.response) {
    return access.response;
  }

  try {
    const payload = stopSessionSchema.parse(await request.json());
    const { tableId } = await context.params;
    await stopTableSession(tableId, {
      ...payload,
      operatorId: access.session.id,
    });
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
