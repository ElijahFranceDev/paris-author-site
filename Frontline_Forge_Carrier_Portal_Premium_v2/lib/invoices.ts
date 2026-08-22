import { createAdminClient } from "@/lib/supabase/admin";
import { createSimplePdf } from "@/lib/pdf";
import { money, safeFileName } from "@/lib/utils";
import { notifyCarrier } from "@/lib/notifications";

export async function generateDispatchInvoice(input: {
  carrierId: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  generatedBy?: string | null;
}) {
  const admin = createAdminClient();
  const { data: carrier } = await admin.from("carriers").select("*").eq("id", input.carrierId).single();
  if (!carrier) throw new Error("Carrier not found.");

  const { data: loadsData } = await admin
    .from("loads")
    .select("id, load_number, rate, fee_rate, broker, pickup_location, delivery_location")
    .eq("carrier_id", input.carrierId)
    .eq("counts_toward_revenue", true)
    .gte("date_booked", input.startDate)
    .lte("date_booked", input.endDate)
    .order("date_booked");

  const loads = loadsData || [];
  const lines = loads.map((load) => ({
    description: `${load.load_number} - ${load.pickup_location} to ${load.delivery_location}`,
    load_id: load.id,
    load_rate: Number(load.rate || 0),
    fee_rate: Number(load.fee_rate || 0),
    amount: Number(load.rate || 0) * Number(load.fee_rate || 0),
  }));
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  const year = new Date().getUTCFullYear();
  const { count } = await admin.from("invoices").select("id", { count: "exact", head: true });
  const invoiceNumber = `FFS-${year}-${String((count || 0) + 1).padStart(5, "0")}`;

  const { data: invoice, error } = await admin
    .from("invoices")
    .insert({
      carrier_id: input.carrierId,
      invoice_number: invoiceNumber,
      period_start: input.startDate,
      period_end: input.endDate,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: input.dueDate,
      subtotal: total,
      total,
      status: "open",
      generated_by: input.generatedBy || null,
    })
    .select("id")
    .single();
  if (error || !invoice) throw error || new Error("Invoice could not be created.");

  if (lines.length) {
    await admin.from("invoice_lines").insert(lines.map((line) => ({ ...line, invoice_id: invoice.id })));
  }

  const pdfBytes = await createSimplePdf({
    title: `DISPATCH INVOICE ${invoiceNumber}`,
    subtitle: `${carrier.company_name} | Due ${input.dueDate}`,
    sections: [
      {
        heading: "INVOICE SUMMARY",
        lines: [
          `Billing period: ${input.startDate} through ${input.endDate}`,
          `Amount due: ${money.format(total)}`,
          `Status: OPEN`,
        ],
      },
      {
        heading: "LOAD FEE BREAKDOWN",
        lines: lines.length
          ? lines.map((line) => `${line.description} | Load rate ${money.format(line.load_rate)} | Fee ${(line.fee_rate * 100).toFixed(2)}% | ${money.format(line.amount)}`)
          : ["No revenue-producing loads were found for the selected period."],
      },
      {
        heading: "PAYMENT NOTE",
        lines: ["Payment instructions are provided separately by Frontline Forge Solutions. Contact FFS with questions regarding this invoice."],
      },
    ],
  });

  const path = `${carrier.id}/invoices/${safeFileName(invoiceNumber)}.pdf`;
  const { error: uploadError } = await admin.storage.from("carrier-documents").upload(path, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  await admin.from("invoices").update({ storage_path: path }).eq("id", invoice.id);
  await admin.from("documents").insert({
    carrier_id: carrier.id,
    document_type: "Dispatch invoice",
    title: invoiceNumber,
    storage_path: path,
    visibility: "carrier",
    status: "active",
    uploaded_by: input.generatedBy || null,
  });

  await notifyCarrier({
    carrierId: carrier.id,
    title: `Dispatch invoice ${invoiceNumber}`,
    message: `A new dispatch invoice for ${money.format(total)} is available. Due date: ${input.dueDate}.`,
    type: "invoice",
    link: "/invoices",
    email: true,
  });

  return invoice;
}
