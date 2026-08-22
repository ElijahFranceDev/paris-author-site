"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { text, optionalText, safeFileName } from "@/lib/utils";
import { logActivity } from "@/lib/activity";
import { notifyCarrier } from "@/lib/notifications";

export async function uploadDocument(formData: FormData) {
  const { profile } = await requireProfile();
  const admin = createAdminClient();
  const carrierId = profile.carrier_id || text(formData, "carrier_id");
  if (!carrierId) throw new Error("Carrier is required.");
  const loadId = optionalText(formData, "load_id");
  if (loadId) {
    const { data: load } = await admin.from("loads").select("carrier_id, driver_id").eq("id", loadId).single();
    if (!load || load.carrier_id !== carrierId) throw new Error("The selected load does not belong to this carrier.");
    if (profile.role === "driver") {
      const { data: driver } = await admin.from("drivers").select("id").eq("user_id", profile.id).single();
      if (!driver || load.driver_id !== driver.id) throw new Error("Drivers may upload documents only for assigned loads.");
    }
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Select a file.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Files must be 12MB or smaller for this portal upload.");
  const documentType = text(formData, "document_type");
  if (profile.role === "driver" && !["BOL", "POD", "Receipt"].includes(documentType)) throw new Error("Drivers may upload BOL, POD, or receipt files only.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `${carrierId}/${loadId || 'company'}/${Date.now()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await admin.storage.from("carrier-documents").upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (uploadError) throw uploadError;
  const { data: document, error } = await admin.from("documents").insert({
    carrier_id: carrierId,
    load_id: loadId,
    document_type: documentType,
    title: text(formData, "title") || file.name,
    storage_path: path,
    expires_on: optionalText(formData, "expires_on"),
    visibility: "carrier",
    status: "active",
    uploaded_by: profile.id,
  }).select("id").single();
  if (error || !document) throw error || new Error("Document record could not be created.");
  await logActivity({ carrierId, actorId: profile.id, loadId, action: `${documentType} uploaded`, entityType: "document", entityId: document.id, details: { title: text(formData, "title") || file.name } });
  await notifyCarrier({ carrierId, title: `${documentType} uploaded`, message: `${text(formData, "title") || file.name} is available in Documents.`, type: "document", link: "/documents", email: documentType === "POD" });
  revalidatePath("/documents"); if (loadId) revalidatePath(`/loads/${loadId}`);
}
