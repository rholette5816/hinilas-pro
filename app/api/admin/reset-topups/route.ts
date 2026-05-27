import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";
import { logAdminAction } from "@/lib/audit-log";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = adminClient();

  // Get all topup transactions
  const { data: topups, error } = await admin
    .from("credit_transactions")
    .select("user_id, amount")
    .eq("type", "topup");

  if (error) {
    console.error("[admin-reset-topups] topup transaction query error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // Aggregate topup credits per user
  const userTopups = new Map<string, number>();
  for (const tx of topups || []) {
    userTopups.set(tx.user_id, (userTopups.get(tx.user_id) || 0) + tx.amount);
  }

  // Reverse credits for each affected user
  for (const [userId, totalGranted] of userTopups.entries()) {
    const { data: userData } = await admin
      .from("user_data")
      .select("credits_remaining, credits_total")
      .eq("user_id", userId)
      .single();

    if (!userData) continue;

    await admin.from("user_data").update({
      credits_remaining: Math.max(0, userData.credits_remaining - totalGranted),
      credits_total: Math.max(0, userData.credits_total - totalGranted),
    }).eq("user_id", userId);
  }

  // Delete all topup transactions
  await admin.from("credit_transactions").delete().eq("type", "topup");

  await logAdminAction({
    adminEmail: user.email ?? "unknown",
    action: "topups_reset",
    details: {
      usersAffected: userTopups.size,
      transactionsDeleted: (topups || []).length,
    },
  });

  return NextResponse.json({
    success: true,
    usersAffected: userTopups.size,
    transactionsDeleted: (topups || []).length,
  });
}
