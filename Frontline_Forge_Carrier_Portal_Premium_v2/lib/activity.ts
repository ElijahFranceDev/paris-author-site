import { createAdminClient } from "@/lib/supabase/admin";

export async function logActivity(input: {
  carrierId: string;
  actorId?: string | null;
  loadId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("activity_logs").insert({
    carrier_id: input.carrierId,
    actor_id: input.actorId || null,
    load_id: input.loadId || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    details: input.details || {},
  });
}
