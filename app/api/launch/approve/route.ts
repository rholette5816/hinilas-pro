import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifyApprovalToken } from "@/lib/approval-token";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`launch-approve:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");
  const token = searchParams.get("token");
  const id = token ? verifyApprovalToken(token) : null;

  if (!id || !action) {
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
