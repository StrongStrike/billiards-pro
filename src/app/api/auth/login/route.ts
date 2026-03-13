import { NextResponse } from "next/server";

import { loginOperator } from "@/lib/auth/session";
import { handleApiError } from "@/lib/server/api";
import { loginSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const result = await loginOperator(payload.email, payload.password);

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 401 });
    }

    return NextResponse.json({ operator: result.session });
  } catch (error) {
    return handleApiError(error);
  }
}
