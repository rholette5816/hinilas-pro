import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerUser } from "@/lib/admin";
import { deductCreditsAtomic } from "@/lib/credits";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isOwnerUser(user)) {
    const { data: userData } = await supabase
      .from("user_data")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ credits: userData?.credits_remaining ?? 0 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = typeof body.amount === "number" && body.amount > 0 ? body.amount : 1;
  const description = body.description || `Credit usage (${amount} credits)`;

  const result = await deductCreditsAtomic({
    userId: user.id,
    amount,
    description,
  });

  if (!result.ok) {
    if (result.code === "NO_CREDITS") {
      return NextResponse.json({ error: "Not enough credits", code: "NO_CREDITS" }, { status: 402 });
    }
    return NextResponse.json({ error: "Credit update failed", code: result.code }, { status: 409 });
  }

  return NextResponse.json({ credits: result.creditsRemaining });
}
