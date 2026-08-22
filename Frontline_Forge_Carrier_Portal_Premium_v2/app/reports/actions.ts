"use server";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { text } from "@/lib/utils";
import { generateCarrierReport } from "@/lib/reports";

export async function generateReport(formData: FormData) {
  const { profile } = await requireProfile();
  const carrierId = profile.carrier_id || text(formData, "carrier_id");
  if (!carrierId) throw new Error("Carrier is required.");
  await generateCarrierReport({
    carrierId,
    reportType: text(formData, "report_type") as "weekly" | "monthly" | "custom",
    startDate: text(formData, "start_date"),
    endDate: text(formData, "end_date"),
    generatedBy: profile.id,
  });
  revalidatePath("/reports"); revalidatePath("/documents"); revalidatePath("/dashboard");
}
