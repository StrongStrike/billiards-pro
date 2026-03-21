import { createCashMovement } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";
import { cashMovementSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = cashMovementSchema.parse(await request.json());
    await createCashMovement({
      ...payload,
      operatorId: session.id,
    });
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
