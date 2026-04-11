import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("user_data")
    .select("credits_remaining")
    .eq("user_id", user.id)
    .single();

  if (!userData || userData.credits_remaining <= 0) {
    return NextResponse.json(
      { error: "No credits remaining", code: "NO_CREDITS" },
      { status: 402 }
    );
  }

  const newCredits = userData.credits_remaining - 1;

  await supabase
    .from("user_data")
    .update({ credits_remaining: newCredits })
    .eq("user_id", user.id);

  await supabase.from("credit_transactions").insert({
    user_id: user.id,
    type: "use",
    amount: -1,
    description: "Image generation",
  });

  return NextResponse.json({ credits: newCredits });
}
