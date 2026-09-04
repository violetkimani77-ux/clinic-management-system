"use client";

import { useState } from "react";

/** Revokes the current session before returning staff to the login screen. */
export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <button type="button" onClick={handleLogout} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
