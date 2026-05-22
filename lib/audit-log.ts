import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function logAdminAction(params: {
  adminEmail: string;
  action: string;
  targetId?: string;
  details?: Record<string, unknown>;
}) {
  await admin.from("admin_audit_logs").insert({
    admin_email: params.adminEmail,
    action: params.action,
    target_id: params.targetId ?? null,
    details: params.details ?? null,
    created_at: new Date().toISOString(),
  });
}
