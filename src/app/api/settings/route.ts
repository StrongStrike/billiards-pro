import { getBootstrapPayload, updateSettings } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiSession, unauthorizedResponse } from "@/lib/server/api";
import { settingsSchema } from "@/lib/validations";

export async function GET() {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const payload = await getBootstrapPayload(session);
  return ok(payload.settings);
}

export async function PATCH(request: Request) {
  const session = await requireApiSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const payload = settingsSchema.parse(await request.json());
    await updateSettings(payload);
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
