import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function notifyCarrier(input: {
  carrierId: string;
  title: string;
  message: string;
  type?: string;
  link?: string | null;
  email?: boolean;
}) {
  const admin = createAdminClient();

  await admin.from("notifications").insert({
    carrier_id: input.carrierId,
    title: input.title,
    message: input.message,
    notification_type: input.type || "general",
    link: input.link || null,
  });

  if (!input.email) {
    return;
  }

  const { data: carrier } = await admin
    .from("carriers")
    .select("company_name, notification_email, email")
    .eq("id", input.carrierId)
    .single();

  const to = carrier?.notification_email || carrier?.email;
  if (!to) {
    return;
  }

  await sendEmail({
    to,
    subject: `FFS Portal: ${input.title}`,
    html: `<div style="font-family:Arial,sans-serif;color:#111"><h2 style="color:#b08a27">Frontline Forge Solutions</h2><p><strong>${input.title}</strong></p><p>${input.message}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://portal.frontlinesf.com'}">Open Carrier Portal</a></p></div>`,
  });
}
