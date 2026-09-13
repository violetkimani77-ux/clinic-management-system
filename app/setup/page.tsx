import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import SetupClient from "./setup-client";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login?next=/setup");
  if (auth.roleCode !== "ADMIN") redirect("/dashboard");
  return <SetupClient />;
}
