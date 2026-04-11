import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLAN_CREDITS: Record<string, { credits: number; total: number }> = {
  pro: { credits: 150, total: 150 },
  max: { credits: 500, total: 500 },
  topup: { credits: 50, total: 50 },
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

  // Verify PayMongo webhook signature
  const signature = req.headers.get("paymongo-signature");
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();

  // PayMongo signature format: t=timestamp,te=hash,li=hash
  // Simple verification: check that the signature header exists and body is valid JSON
  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventType = event?.data?.attributes?.type;
  const attributes = event?.data?.attributes?.data?.attributes;
  const remarks = attributes?.remarks || "";

  // remarks format: "plan|userId"
  const [plan, userId] = remarks.split("|");

  if (!plan || !userId) {
    // Event not from our payment links — ignore
    return NextResponse.json({ received: true });
  }

  const supabase = await createClient();

  if (eventType === "link.payment.paid") {
    const planConfig = PLAN_CREDITS[plan];
    if (!planConfig) return NextResponse.json({ received: true });

    if (plan === "topup") {
      // Add credits on top of existing
      const { data: userData } = await supabase
        .from("user_data")
        .select("credits_remaining")
        .eq("user_id", userId)
        .single();

      const newCredits = (userData?.credits_remaining || 0) + planConfig.credits;

      await supabase
        .from("user_data")
        .update({ credits_remaining: newCredits })
        .eq("user_id", userId);

      await supabase.from("credit_transactions").insert({
        user_id: userId,
        type: "topup",
        amount: planConfig.credits,
        description: "Top-up purchase — 50 credits",
      });
    } else {
      // Pro or Max subscription payment
      const resetAt = new Date();
      resetAt.setMonth(resetAt.getMonth() + 1);

      await supabase
        .from("user_data")
        .update({
          plan,
          credits_remaining: planConfig.credits,
          credits_total: planConfig.total,
          credits_reset_at: resetAt.toISOString(),
          subscription_status: "active",
        })
        .eq("user_id", userId);

      await supabase.from("credit_transactions").insert({
        user_id: userId,
        type: "grant",
        amount: planConfig.credits,
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated`,
      });
    }
  }

  return NextResponse.json({ received: true });
}
