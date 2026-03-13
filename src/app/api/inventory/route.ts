import { getBootstrapPayload, updateInventory } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";
import { inventoryPatchSchema } from "@/lib/validations";

export async function GET() {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const payload = await getBootstrapPayload(session);
  return ok({
    products: payload.products,
    stockMovements: payload.stockMovements,
  });
}

export async function PATCH(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = inventoryPatchSchema.parse(await request.json());
    await updateInventory(payload);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
