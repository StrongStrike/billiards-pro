import { getBootstrapPayload, updateSettings } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiRole } from "@/lib/server/api";
import { settingsSchema } from "@/lib/validations";

export async function GET() {
  const access = await requireApiRole(["admin"]);
  if (access.response) {
    return access.response;
  }

  const payload = await getBootstrapPayload(access.session);
  return ok(payload.settings);
}

export async function PATCH(request: Request) {
  const access = await requireApiRole(["admin"]);
  if (access.response) {
    return access.response;
  }

  try {
    const payload = settingsSchema.parse(await request.json());
    await updateSettings({
      ...payload,
      operatorId: access.session.id,
    });
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
