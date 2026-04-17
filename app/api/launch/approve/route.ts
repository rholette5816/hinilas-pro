import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const action = searchParams.get("action");
  const secret = searchParams.get("secret");

  if (!id || !action || secret !== process.env.TOPUP_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = adminClient();

  const { data: launch } = await admin
    .from("campaign_launches")
    .select("user_id, status")
    .eq("id", id)
    .single();

  if (!launch) return new NextResponse("Launch not found", { status: 404 });
  if (launch.status !== "pending") {
    return new NextResponse(`Already ${launch.status}. No action taken.`, { status: 200 });
  }

  if (action === "approve") {
    const CREDITS = 20;

    // Update launch status
    await admin
      .from("campaign_launches")
      .update({ status: "approved", credits_awarded: CREDITS })
      .eq("id", id);

    // Get current credits
    const { data: userData } = await admin
      .from("user_data")
      .select("credits_remaining, credits_total, launches_approved")
      .eq("user_id", launch.user_id)
      .single();

    if (userData) {
      await admin
        .from("user_data")
        .update({
          credits_remaining: userData.credits_remaining + CREDITS,
          credits_total: userData.credits_total + CREDITS,
          launches_approved: (userData.launches_approved || 0) + 1,
        })
        .eq("user_id", launch.user_id);

      await admin.from("credit_transactions").insert({
        user_id: launch.user_id,
        type: "grant",
        amount: CREDITS,
        description: "Campaign launch verified — proof approved",
      });
    }

    return new NextResponse("✅ Approved! 20 credits awarded.", { status: 200 });
  }

  if (action === "reject") {
    await admin
      .from("campaign_launches")
      .update({ status: "rejected" })
      .eq("id", id);

    return new NextResponse("❌ Rejected. No credits awarded.", { status: 200 });
  }

  return new NextResponse("Invalid action", { status: 400 });
}
