import { updateOperatorRole } from "@/lib/server/club-service";
import { handleApiError, ok, requireApiRole } from "@/lib/server/api";
import { operatorRoleSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ operatorId: string }> },
) {
  const access = await requireApiRole(["admin"]);
  if (access.response) {
    return access.response;
  }

  try {
    const payload = operatorRoleSchema.parse(await request.json());
    const { operatorId } = await context.params;
    await updateOperatorRole(operatorId, {
      role: payload.role,
      actorOperatorId: access.session.id,
    });
    return ok({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
