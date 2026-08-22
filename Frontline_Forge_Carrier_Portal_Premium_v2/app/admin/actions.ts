"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { text, optionalText, numberValue } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { notifyCarrier } from "@/lib/notifications";

export async function addCarrier(formData: FormData) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();
  const companyName = text(formData, "company_name");
  const carrierCode = text(formData, "carrier_code")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const ownerName = text(formData, "contact_name");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "temporary_password");

  const { data: carrier, error: carrierError } = await admin
    .from("carriers")
    .insert({
      company_name: companyName,
      carrier_code: carrierCode,
      mc_number: optionalText(formData, "mc_number"),
      dot_number: optionalText(formData, "dot_number"),
      contact_name: ownerName,
      email,
      phone: optionalText(formData, "phone"),
      notification_email: email,
      billing_email: email,
      fee_rate: numberValue(formData, "fee_percentage", 5) / 100,
      portal_plan: "premium",
      weekly_report_enabled: true,
      monthly_report_enabled: true,
      status: "active",
    })
    .select("id")
    .single();

  if (carrierError || !carrier) {
    throw carrierError || new Error("Carrier could not be created.");
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        company_name: companyName,
      },
    });

  if (authError || !authData.user) {
    await admin.from("carriers").delete().eq("id", carrier.id);
    throw authError || new Error("Carrier login could not be created.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    full_name: ownerName,
    email,
    phone: optionalText(formData, "phone"),
    role: "carrier_owner",
    carrier_id: carrier.id,
    must_change_password: true,
    status: "active",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    await admin.from("carriers").delete().eq("id", carrier.id);
    throw profileError;
  }

  await logActivity({
    carrierId: carrier.id,
    actorId: profile.id,
    action: `${companyName} premium portal created`,
    entityType: "carrier",
    entityId: carrier.id,
  });

  revalidatePath("/admin");
  revalidatePath("/fleet");
}

export async function deletePortalUser(formData: FormData) {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();
  const userId = text(formData, "user_id");
  const confirmation = text(formData, "confirmation").toUpperCase();

  if (confirmation !== "DELETE") {
    throw new Error('Type "DELETE" to confirm the removal.');
  }

  if (userId === profile.id) {
    throw new Error("You cannot delete your own administrator login.");
  }

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, full_name, email, role, carrier_id")
    .eq("id", userId)
    .single();

  if (targetError || !target) {
    throw targetError || new Error("Portal user was not found.");
  }

  if (target.role === "admin") {
    throw new Error("Administrator accounts cannot be deleted here.");
  }

  const { error: authDeleteError } =
    await admin.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    throw authDeleteError;
  }

  // This cleanup is harmless if the auth-user deletion already cascaded.
  await admin.from("profiles").delete().eq("id", userId);

  if (target.carrier_id) {
    await logActivity({
      carrierId: target.carrier_id,
      actorId: profile.id,
      action: `Portal login deleted for ${target.full_name || target.email}`,
      entityType: "profile",
      entityId: target.id,
      details: {
        deleted_email: target.email,
        deleted_role: target.role,
      },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/fleet");
}

export async function addLoad(formData: FormData) {
  const { supabase, profile } = await requireStaff();
  const carrierId = text(formData, "carrier_id");

  const { data: carrier } = await supabase
    .from("carriers")
    .select("fee_rate")
    .eq("id", carrierId)
    .single();

  if (!carrier) {
    throw new Error("Carrier not found.");
  }

  const { data, error } = await supabase
    .from("loads")
    .insert({
      carrier_id: carrierId,
      load_number: text(formData, "load_number"),
      date_booked: text(formData, "date_booked"),
      broker: text(formData, "broker"),
      broker_load_number: optionalText(formData, "broker_load_number"),
      pickup_location: text(formData, "pickup_location"),
      delivery_location: text(formData, "delivery_location"),
      pickup_date: text(formData, "pickup_date"),
      delivery_date: text(formData, "delivery_date"),
      pickup_time: optionalText(formData, "pickup_time"),
      delivery_time: optionalText(formData, "delivery_time"),
      rate: numberValue(formData, "rate"),
      dispatcher_name: optionalText(formData, "dispatcher_name"),
      dispatcher_fee_percent: numberValue(formData, "dispatcher_fee_percent"),
      status: text(formData, "status"),
      counts_toward_revenue:
        formData.get("counts_toward_revenue") === "on",
      fee_rate: Number(carrier.fee_rate || 0),
      commodity: optionalText(formData, "commodity"),
      weight: numberValue(formData, "weight") || null,
      equipment_type: optionalText(formData, "equipment_type"),
      miles_loaded: numberValue(formData, "miles_loaded"),
      miles_deadhead: numberValue(formData, "miles_deadhead"),
      driver_id: optionalText(formData, "driver_id"),
      truck_id: optionalText(formData, "truck_id"),
      notes: optionalText(formData, "notes"),
    })
    .select("id, load_number")
    .single();

  if (error || !data) {
    throw error || new Error("Load could not be added.");
  }

  await logActivity({
    carrierId,
    actorId: profile.id,
    loadId: data.id,
    action: `Load ${data.load_number} added`,
    entityType: "load",
    entityId: data.id,
  });

  await notifyCarrier({
    carrierId,
    title: `New load ${data.load_number}`,
    message: `${text(formData, "pickup_location")} to ${text(
      formData,
      "delivery_location"
    )} was added to the portal.`,
    type: "load",
    link: `/loads/${data.id}`,
    email: true,
  });

  revalidatePath("/admin");
  revalidatePath("/loads");
  revalidatePath("/dashboard");
}

export async function updateCarrierSettings(formData: FormData) {
  const { supabase, profile } = await requireAdmin();
  const carrierId = text(formData, "carrier_id");
  const payload = {
    fee_rate: numberValue(formData, "fee_percentage") / 100,
    portal_plan: text(formData, "portal_plan"),
    status: text(formData, "status"),
    weekly_report_enabled:
      formData.get("weekly_report_enabled") === "on",
    monthly_report_enabled:
      formData.get("monthly_report_enabled") === "on",
    notification_email: optionalText(formData, "notification_email"),
    billing_email: optionalText(formData, "billing_email"),
    notes: optionalText(formData, "notes"),
  };

  const { error } = await supabase
    .from("carriers")
    .update(payload)
    .eq("id", carrierId);

  if (error) {
    throw error;
  }

  await logActivity({
    carrierId,
    actorId: profile.id,
    action: "Carrier settings updated",
    entityType: "carrier",
    entityId: carrierId,
    details: payload,
  });

  revalidatePath("/admin");
  revalidatePath("/profile");
}
