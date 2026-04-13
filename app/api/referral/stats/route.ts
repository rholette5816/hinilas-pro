import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all referral transactions for this user
  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("amount, description, created_at")
    .eq("user_id", user.id)
    .eq("type", "referral")
    .order("created_at", { ascending: false });

  if (!transactions) return NextResponse.json({ total: 0, credits: 0, history: [] });

  // Count signup referrals (5 credit entries = signups)
  const signups = transactions.filter(t => t.amount === 5 && t.description.includes("signup")).length;
  const totalCredits = transactions.reduce((sum, t) => sum + t.amount, 0);

  return NextResponse.json({
    total: signups,
    credits: totalCredits,
    history: transactions,
  });
}
