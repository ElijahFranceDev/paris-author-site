"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { text } from "@/lib/utils";
import { generateDispatchInvoice } from "@/lib/invoices";

export async function generateInvoice(formData: FormData) {
  const { profile } = await requireStaff();
  await generateDispatchInvoice({ carrierId: text(formData,"carrier_id"), startDate: text(formData,"start_date"), endDate: text(formData,"end_date"), dueDate: text(formData,"due_date"), generatedBy: profile.id });
  revalidatePath("/invoices"); revalidatePath("/documents"); revalidatePath("/dashboard");
}
