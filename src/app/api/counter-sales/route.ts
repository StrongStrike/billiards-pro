import { createCounterSale } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";
import { counterSaleSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = counterSaleSchema.parse(await request.json());
    await createCounterSale(payload);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
