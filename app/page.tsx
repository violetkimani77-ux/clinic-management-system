import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";

/**
 * The root URL is an entry point, not a separate public landing page.
 * Staff who already have a valid session go straight to their workspace;
 * everyone else starts at the staff login screen.
 */
export default async function HomePage() {
  const authContext = await getAuthContext();

  redirect(authContext ? "/dashboard" : "/login");
}
