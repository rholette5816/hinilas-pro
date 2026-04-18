import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Owner gets unlimited free access — skip all credit checks and logging
  if (isOwnerUser(user)) {
    const { data: userData } = await supabase.from("user_data").select("credits_remaining").eq("user_id", user.id).single();
    return NextResponse.json({ credits: userData?.credits_remaining ?? 0 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = typeof body.amount === "number" && body.amount > 0 ? body.amount : 1;
  const description = body.description || `Credit usage (${amount} credits)`;

  const { data: userData } = await supabase
    .from("user_data")
    .select("credits_remaining")
    .eq("user_id", user.id)
    .single();

  if (!userData || userData.credits_remaining < amount) {
    return NextResponse.json(
      { error: "Not enough credits", code: "NO_CREDITS" },
      { status: 402 }
    );
  }

  const newCredits = userData.credits_remaining - amount;

  await supabase
    .from("user_data")
    .update({ credits_remaining: newCredits })
    .eq("user_id", user.id);

  await supabase.from("credit_transactions").insert({
    user_id: user.id,
    type: "use",
    amount: -amount,
    description,
  });

  return NextResponse.json({ credits: newCredits });
}
