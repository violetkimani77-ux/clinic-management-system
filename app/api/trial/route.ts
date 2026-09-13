import { NextRequest, NextResponse } from "next/server";
import { createClinicTrial } from "@/lib/platform/trials";

type FieldName = "clinicName" | "administratorName" | "email" | "password";

function errorResponse(message: string, status: number, fieldErrors?: Partial<Record<FieldName, string>>) {
  return NextResponse.json({ error: message, ...(fieldErrors ? { fieldErrors } : {}) }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return errorResponse("Invalid request origin.", 403);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/x-www-form-urlencoded")) return errorResponse("Unsupported request format.", 415);

  const form = await request.formData();
  const clinicName = String(form.get("clinicName") ?? "");
  const administratorName = String(form.get("administratorName") ?? "");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip");

  try {
    await createClinicTrial({ clinicName, administratorName, email, password, ipAddress });
    return NextResponse.redirect(new URL("/trial/success", request.url), { status: 303, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TRIAL_CREATION_FAILED";
    if (message === "TRIAL_RATE_LIMITED") return errorResponse("Too many trial attempts. Please try again later.", 429);
    if (message === "TRIAL_EMAIL_ALREADY_REGISTERED") return errorResponse("An account with that email already exists. Please sign in instead.", 409, { email: "An account with this email already exists. Please sign in instead." });
    const fieldMessages: Partial<Record<string, { field: FieldName; message: string }>> = {
      INVALID_CLINIC_NAME: { field: "clinicName", message: "Enter a valid clinic name between 2 and 120 characters." },
      INVALID_ADMINISTRATOR_NAME: { field: "administratorName", message: "Enter a valid administrator name between 2 and 120 characters." },
      INVALID_EMAIL: { field: "email", message: "Enter a valid administrator email address." },
      INVALID_PASSWORD: { field: "password", message: "Use a password between 12 and 128 characters." },
    };
    const fieldError = fieldMessages[message];
    if (fieldError) return errorResponse("Please check the highlighted field and try again.", 400, { [fieldError.field]: fieldError.message });
    console.error("Trial signup failed", { code: message });
    return errorResponse("We couldn't create your trial right now. Please try again later.", 500);
  }
}
