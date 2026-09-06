import { NextRequest, NextResponse } from "next/server";
import { createClinicTrial } from "@/lib/platform/trials";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return NextResponse.json({ error: "Unsupported request format." }, { status: 415 });
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

    const response = NextResponse.redirect(new URL(`/trial/success?email=${encodeURIComponent(trial.email)}`, request.url), 303);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "TRIAL_CREATION_FAILED";
    const status = message === "TRIAL_RATE_LIMITED" ? 429 : message === "TRIAL_EMAIL_ALREADY_REGISTERED" ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
