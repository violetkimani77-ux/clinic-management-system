import { NextRequest, NextResponse } from "next/server";
import { createClinicTrial } from "@/lib/platform/trials";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return errorResponse("Invalid request origin.", 403);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/x-www-form-urlencoded")) {
    return errorResponse("Unsupported request format.", 415);
  }

  const form = await request.formData();
  const clinicName = String(form.get("clinicName") ?? "");
  const administratorName = String(form.get("administratorName") ?? "");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip");

  try {
    const trial = await createClinicTrial({
      clinicName,
      administratorName,
      email,
      password,
      ipAddress,
    });

    return NextResponse.redirect(
      new URL(`/trial/success?email=${encodeURIComponent(trial.email)}`, request.url),
      303,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "TRIAL_CREATION_FAILED";

    if (message === "TRIAL_RATE_LIMITED") {
      return errorResponse("Too many trial attempts. Please try again later.", 429);
    }

    if (message === "TRIAL_EMAIL_ALREADY_REGISTERED") {
      return errorResponse("An account with that email already exists. Please sign in instead.", 409);
    }

    if (
      message === "INVALID_CLINIC_NAME" ||
      message === "INVALID_ADMINISTRATOR_NAME" ||
      message === "INVALID_EMAIL" ||
      message === "INVALID_PASSWORD"
    ) {
      return errorResponse("Please check the form details and try again.", 400);
    }

    console.error("Trial signup failed", { code: message });
    return errorResponse("We couldn't create your trial right now. Please try again later.", 500);
  }
}
