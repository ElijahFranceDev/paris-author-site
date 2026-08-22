"use client";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function signOut() {
    await createClient().auth.signOut();
    window.location.href = "/login";
  }

  return <button className="button ghost" onClick={signOut}>Sign out</button>;
}
