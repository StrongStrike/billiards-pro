import { createReservation } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";
import { reservationSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = reservationSchema.parse(await request.json());
    await createReservation(payload);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
