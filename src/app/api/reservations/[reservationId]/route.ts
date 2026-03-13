import { updateReservation } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";
import { reservationPatchSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reservationId: string }> },
) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = reservationPatchSchema.parse(await request.json());
    const { reservationId } = await context.params;
    await updateReservation(reservationId, payload);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
