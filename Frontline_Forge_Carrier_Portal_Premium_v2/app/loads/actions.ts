"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { text, optionalText, numberValue } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { notifyCarrier } from "@/lib/notifications";

export async function updateLoad(formData: FormData) {
  const { supabase, profile } = await requireStaff();
  const id = text(formData, "id");
  const { data: current } = await supabase.from("loads").select("carrier_id, load_number").eq("id", id).single();
  if (!current) throw new Error("Load not found.");

  const payload = {
    status: text(formData, "status"),
    notes: optionalText(formData, "notes"),
    counts_toward_revenue: formData.get("counts_toward_revenue") === "on",
    broker_load_number: optionalText(formData, "broker_load_number"),
    dispatcher_name: optionalText(formData, "dispatcher_name"),
    dispatcher_fee_percent: numberValue(formData, "dispatcher_fee_percent"),
    commodity: optionalText(formData, "commodity"),
    weight: numberValue(formData, "weight") || null,
    equipment_type: optionalText(formData, "equipment_type"),
    pickup_time: optionalText(formData, "pickup_time"),
    delivery_time: optionalText(formData, "delivery_time"),
    miles_loaded: numberValue(formData, "miles_loaded"),
    miles_deadhead: numberValue(formData, "miles_deadhead"),
    fuel_cost: numberValue(formData, "fuel_cost"),
    tolls: numberValue(formData, "tolls"),
    lumper: numberValue(formData, "lumper"),
    detention: numberValue(formData, "detention"),
    layover: numberValue(formData, "layover"),
    tonu: numberValue(formData, "tonu"),
    other_accessorials: numberValue(formData, "other_accessorials"),
    invoice_status: text(formData, "invoice_status") || "not_invoiced",
    payment_status: text(formData, "payment_status") || "pending",
    driver_id: optionalText(formData, "driver_id"),
    truck_id: optionalText(formData, "truck_id"),
  };

  const { error } = await supabase.from("loads").update(payload).eq("id", id);
  if (error) throw error;

  await logActivity({ carrierId: current.carrier_id, actorId: profile.id, loadId: id, action: `Load ${current.load_number} updated`, entityType: "load", entityId: id, details: payload });
  await notifyCarrier({ carrierId: current.carrier_id, title: `${current.load_number} updated`, message: `Status: ${payload.status}. Open the portal for current details.`, type: "load", link: `/loads/${id}`, email: true });
  revalidatePath(`/loads/${id}`); revalidatePath("/loads"); revalidatePath("/dashboard");
}
