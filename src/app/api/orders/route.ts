import { createTableOrder } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";
import { orderSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = orderSchema.parse(await request.json());
    await createTableOrder(payload);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
