import { createAdminClient } from "@/lib/supabase/admin";
import { createSimplePdf } from "@/lib/pdf";
import { money, safeFileName } from "@/lib/utils";
import { notifyCarrier } from "@/lib/notifications";

export async function generateCarrierReport(input: {
  carrierId: string;
  reportType: "weekly" | "monthly" | "custom";
  startDate: string;
  endDate: string;
  generatedBy?: string | null;
}) {
  const admin = createAdminClient();
  const { data: carrier } = await admin.from("carriers").select("*").eq("id", input.carrierId).single();
  if (!carrier) throw new Error("Carrier not found.");

  const { data: loadsData } = await admin
    .from("loads")
    .select("*")
    .eq("carrier_id", input.carrierId)
    .gte("date_booked", input.startDate)
    .lte("date_booked", input.endDate)
    .order("date_booked");

  const loads = loadsData || [];
  const active = loads.filter((load) => load.counts_toward_revenue);
  const gross = active.reduce((sum, load) => sum + Number(load.rate || 0), 0);
  const fees = active.reduce((sum, load) => sum + Number(load.rate || 0) * Number(load.fee_rate || 0), 0);
  const loadedMiles = active.reduce((sum, load) => sum + Number(load.miles_loaded || 0), 0);
  const deadheadMiles = active.reduce((sum, load) => sum + Number(load.miles_deadhead || 0), 0);

  const { data: fuelData } = await admin
    .from("fuel_entries")
    .select("amount, gallons")
    .eq("carrier_id", input.carrierId)
    .gte("entry_date", input.startDate)
    .lte("entry_date", input.endDate);

  const fuelCost = (fuelData || []).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const gallons = (fuelData || []).reduce((sum, entry) => sum + Number(entry.gallons || 0), 0);

  const loadLines = loads.length
    ? loads.map((load) => `${load.load_number} | ${load.broker} | ${load.pickup_location} to ${load.delivery_location} | ${money.format(Number(load.rate || 0))} | ${load.status}`)
    : ["No loads were recorded in this period."];

  const pdfBytes = await createSimplePdf({
    title: `${input.reportType.toUpperCase()} CARRIER OPERATIONS REPORT`,
    subtitle: `${carrier.company_name} | ${input.startDate} through ${input.endDate}`,
    sections: [
      {
        heading: "EXECUTIVE SUMMARY",
        lines: [
          `Loads recorded: ${loads.length}`,
          `Revenue-producing loads: ${active.length}`,
          `Gross revenue: ${money.format(gross)}`,
          `Dispatch/load fees: ${money.format(fees)}`,
          `Loaded miles: ${loadedMiles.toLocaleString()}`,
          `Deadhead miles: ${deadheadMiles.toLocaleString()}`,
          `Fuel expense: ${money.format(fuelCost)} across ${gallons.toFixed(2)} gallons`,
        ],
      },
      { heading: "LOAD ACTIVITY", lines: loadLines },
      {
        heading: "FFS RECORDKEEPING NOTE",
        lines: ["Canceled and not-taken loads remain visible for audit history but are excluded from active gross revenue and fee calculations unless specifically marked otherwise."],
      },
    ],
  });

  const title = `${carrier.carrier_code} ${input.reportType} report ${input.startDate} to ${input.endDate}`;
  const path = `${carrier.id}/reports/${safeFileName(title)}.pdf`;

  const { error: uploadError } = await admin.storage
    .from("carrier-documents")
    .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { data: report, error: reportError } = await admin
    .from("reports")
    .insert({
      carrier_id: carrier.id,
      report_type: input.reportType,
      period_start: input.startDate,
      period_end: input.endDate,
      title,
      storage_path: path,
      total_loads: loads.length,
      gross_revenue: gross,
      fee_total: fees,
      total_loaded_miles: loadedMiles,
      total_deadhead_miles: deadheadMiles,
      fuel_cost: fuelCost,
      generated_by: input.generatedBy || null,
    })
    .select("id")
    .single();
  if (reportError) throw reportError;

  await admin.from("documents").insert({
    carrier_id: carrier.id,
    document_type: `${input.reportType} report`,
    title,
    storage_path: path,
    visibility: "carrier",
    status: "active",
    uploaded_by: input.generatedBy || null,
  });

  await notifyCarrier({
    carrierId: carrier.id,
    title: `${input.reportType === 'weekly' ? 'Weekly' : input.reportType === 'monthly' ? 'Monthly' : 'Custom'} report ready`,
    message: `${title} is available in the Documents and Reports sections.`,
    type: "report",
    link: "/reports",
    email: true,
  });

  return report;
}
