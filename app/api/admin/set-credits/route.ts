import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { isOwnerUser } from "@/lib/admin";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isOwnerUser(user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, credits, note } = await req.json();
  if (!userId || typeof credits !== "number" || credits < 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = adminClient();

  const { data: existing } = await admin
    .from("user_data")
    .select("credits_remaining, credits_total")
    .eq("user_id", userId)
    .single();

  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const diff = credits - existing.credits_remaining;
  const newTotal = Math.max(existing.credits_total + diff, credits);

  await admin.from("user_data").update({
    credits_remaining: credits,
    credits_total: newTotal,
  }).eq("user_id", userId);

  await admin.from("credit_transactions").insert({
    user_id: userId,
    type: "grant",
    amount: diff,
    description: note || `Admin adjusted credits to ${credits}`,
  });

  return NextResponse.json({ success: true, credits, diff });
}
