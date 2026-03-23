import { updateReservation } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiRole } from "@/lib/server/api";
import { reservationPatchSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reservationId: string }> },
) {
  const access = await requireApiRole(["admin", "cashier"]);
  if (access.response) {
    return access.response;
  }

  try {
    const payload = reservationPatchSchema.parse(await request.json());
    const { reservationId } = await context.params;
    await updateReservation(reservationId, {
      ...payload,
      operatorId: access.session.id,
    });
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
