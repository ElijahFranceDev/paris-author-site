"use server";
import { revalidatePath } from "next/cache";
import { requireProfile, requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { text, optionalText, numberValue } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export async function addTruck(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const carrierId = profile.carrier_id || text(formData, "carrier_id");
  if (!carrierId) throw new Error("Carrier is required.");
  const { data, error } = await supabase.from("trucks").insert({
    carrier_id: carrierId,
    unit_number: text(formData, "unit_number"),
    equipment_type: text(formData, "equipment_type"),
    year: numberValue(formData, "year") || null,
    make: optionalText(formData, "make"),
    model: optionalText(formData, "model"),
    vin_last6: optionalText(formData, "vin_last6"),
    capacity_lbs: numberValue(formData, "capacity_lbs") || null,
    plate_number: optionalText(formData, "plate_number"),
    insurance_expires_on: optionalText(formData, "insurance_expires_on"),
    registration_expires_on: optionalText(formData, "registration_expires_on"),
    status: "active",
  }).select("id").single();
  if (error || !data) throw error || new Error("Truck could not be added.");
  await logActivity({ carrierId, actorId: profile.id, action: `Truck ${text(formData, "unit_number")} added`, entityType: "truck", entityId: data.id });
  revalidatePath("/fleet"); revalidatePath("/admin");
}

export async function addDriver(formData: FormData) {
  const { profile } = await requireStaff();
  const carrierId = text(formData, "carrier_id");
  const fullName = text(formData, "full_name");
  const email = text(formData, "email").toLowerCase();
  const password = text(formData, "temporary_password");
  const admin = createAdminClient();
  let userId: string | null = null;

  if (email && password) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error || !data.user) throw error || new Error("Driver login could not be created.");
    userId = data.user.id;
    await admin.from("profiles").insert({ id: userId, full_name: fullName, email, phone: optionalText(formData, "phone"), role: "driver", carrier_id: carrierId, must_change_password: true, status: "active" });
  }

  const { data: driver, error: driverError } = await admin.from("drivers").insert({
    carrier_id: carrierId,
    user_id: userId,
    full_name: fullName,
    email: email || null,
    phone: optionalText(formData, "phone"),
    assigned_truck_id: optionalText(formData, "assigned_truck_id"),
    cdl_number: optionalText(formData, "cdl_number"),
    cdl_expires_on: optionalText(formData, "cdl_expires_on"),
    medical_card_expires_on: optionalText(formData, "medical_card_expires_on"),
    emergency_contact: optionalText(formData, "emergency_contact"),
    status: "active",
  }).select("id").single();
  if (driverError || !driver) {
    if (userId) await admin.auth.admin.deleteUser(userId);
    throw driverError || new Error("Driver could not be added.");
  }
  await logActivity({ carrierId, actorId: profile.id, action: `Driver ${fullName} added`, entityType: "driver", entityId: driver.id });
  revalidatePath("/fleet"); revalidatePath("/admin");
}
