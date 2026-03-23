import { getBootstrapPayload, updateInventory } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiRole } from "@/lib/server/api";
import { inventoryPatchSchema } from "@/lib/validations";

export async function GET() {
  const access = await requireApiRole(["admin"]);
  if (access.response) {
    return access.response;
  }

  const payload = await getBootstrapPayload(access.session);
  return ok({
    products: payload.products,
    stockMovements: payload.stockMovements,
  });
}

export async function PATCH(request: Request) {
  const access = await requireApiRole(["admin"]);
  if (access.response) {
    return access.response;
  }

  try {
    const payload = inventoryPatchSchema.parse(await request.json());
    await updateInventory({
      ...payload,
      operatorId: access.session.id,
    });
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
