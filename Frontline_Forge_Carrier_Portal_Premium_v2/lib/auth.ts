import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function requireProfile(options?: { allowPasswordChange?: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, carrier_id, must_change_password, status")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.status !== "active") {
    redirect("/login?error=Portal%20profile%20not%20available");
  }

  if (profile.must_change_password && !options?.allowPasswordChange) {
    redirect("/change-password");
  }

  return { supabase, user, profile: profile as Profile };
}

export async function requireStaff() {
  const context = await requireProfile();
  if (!['admin', 'dispatcher'].includes(context.profile.role)) {
    redirect("/dashboard");
  }
  return context;
}

export async function requireAdmin() {
  const context = await requireProfile();
  if (context.profile.role !== "admin") {
    redirect("/dashboard");
  }
  return context;
}
