"use server";
import { revalidatePath } from "next/cache";
import { requireProfile, requireStaff } from "@/lib/auth";
import { text, optionalText } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { notifyCarrier } from "@/lib/notifications";

export async function createSupportRequest(formData: FormData) {
  const { supabase, profile } = await requireProfile();
  const carrierId = profile.carrier_id || text(formData,"carrier_id");
  if (!carrierId) throw new Error("Carrier is required.");
  const { data, error } = await supabase.from("support_requests").insert({ carrier_id: carrierId, created_by: profile.id, load_id: optionalText(formData,"load_id"), category: text(formData,"category"), subject: text(formData,"subject"), description: text(formData,"description"), priority: text(formData,"priority") || "normal", status: "New" }).select("id").single();
  if (error || !data) throw error || new Error("Request could not be submitted.");
  await logActivity({ carrierId, actorId: profile.id, action: `Support request submitted: ${text(formData,"subject")}`, entityType: "support_request", entityId: data.id });
  await notifyCarrier({ carrierId, title: "Support request received", message: `${text(formData,"subject")} has been submitted to FFS.`, type: "support", link: "/support", email: true });
  revalidatePath("/support"); revalidatePath("/dashboard");
}

export async function updateSupportRequest(formData: FormData) {
  const { supabase, profile } = await requireStaff();
  const id = text(formData,"id");
  const { data: request } = await supabase.from("support_requests").select("carrier_id, subject").eq("id",id).single();
  if (!request) throw new Error("Request not found.");
  await supabase.from("support_requests").update({ status: text(formData,"status"), assigned_to: profile.id, resolution_notes: optionalText(formData,"resolution_notes"), updated_at: new Date().toISOString() }).eq("id",id);
  await notifyCarrier({ carrierId: request.carrier_id, title: "Support request updated", message: `${request.subject} is now ${text(formData,"status")}.`, type: "support", link: "/support", email: true });
  revalidatePath("/support");
}
