import { createCashMovement } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiRole } from "@/lib/server/api";
import { cashMovementSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const access = await requireApiRole(["admin", "cashier"]);
  if (access.response) {
    return access.response;
  }

  try {
    const payload = cashMovementSchema.parse(await request.json());
    await createCashMovement({
      ...payload,
      operatorId: access.session.id,
    });
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
