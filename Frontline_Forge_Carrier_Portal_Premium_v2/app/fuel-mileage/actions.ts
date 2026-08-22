"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { text, optionalText, numberValue } from "@/lib/utils";
import { logActivity } from "@/lib/activity";

export async function addFuelEntry(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const carrierId = profile.carrier_id || text(formData, "carrier_id");
  if (!carrierId) throw new Error("Carrier is required.");
  const { data, error } = await supabase.from("fuel_entries").insert({ carrier_id: carrierId, driver_id: optionalText(formData,"driver_id"), truck_id: optionalText(formData,"truck_id"), load_id: optionalText(formData,"load_id"), entry_date: text(formData,"entry_date"), vendor: optionalText(formData,"vendor"), city: optionalText(formData,"city"), state: optionalText(formData,"state"), gallons: numberValue(formData,"gallons"), price_per_gallon: numberValue(formData,"price_per_gallon"), amount: numberValue(formData,"amount"), odometer: numberValue(formData,"odometer") || null, notes: optionalText(formData,"notes"), created_by: profile.id }).select("id").single();
  if (error || !data) throw error || new Error("Fuel entry could not be added.");
  await logActivity({ carrierId, actorId: profile.id, action: "Fuel entry added", entityType: "fuel_entry", entityId: data.id, details: { amount: numberValue(formData,"amount") } });
  revalidatePath("/fuel-mileage"); revalidatePath("/dashboard");
}

export async function addMileageEntry(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const carrierId = profile.carrier_id || text(formData, "carrier_id");
  if (!carrierId) throw new Error("Carrier is required.");
  const { data, error } = await supabase.from("mileage_entries").insert({ carrier_id: carrierId, driver_id: optionalText(formData,"driver_id"), truck_id: optionalText(formData,"truck_id"), load_id: optionalText(formData,"load_id"), entry_date: text(formData,"entry_date"), start_location: optionalText(formData,"start_location"), end_location: optionalText(formData,"end_location"), loaded_miles: numberValue(formData,"loaded_miles"), deadhead_miles: numberValue(formData,"deadhead_miles"), personal_miles: numberValue(formData,"personal_miles"), notes: optionalText(formData,"notes"), created_by: profile.id }).select("id").single();
  if (error || !data) throw error || new Error("Mileage entry could not be added.");
  await logActivity({ carrierId, actorId: profile.id, action: "Mileage entry added", entityType: "mileage_entry", entityId: data.id });
  revalidatePath("/fuel-mileage"); revalidatePath("/dashboard");
}
