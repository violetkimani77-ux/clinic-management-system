"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticatePlatformAdmin } from "@/lib/platform/auth";
import { PLATFORM_SESSION_COOKIE } from "@/lib/platform/session";

export async function platformLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const mfaCode = String(formData.get("mfaCode") ?? "");

  const result = await authenticatePlatformAdmin(email, password, mfaCode);
  if (!result) {
    redirect("/platform/login?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/platform",
    expires: result.expiresAt,
  });

  redirect("/platform");
}
