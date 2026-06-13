import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { grantCreditsAtomic } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`credits-refund:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const amount = typeof body.amount === "number" && body.amount > 0 ? body.amount : 0;
  const description = typeof body.description === "string" && body.description.trim()
    ? body.description.trim()
    : `Credit refund (${amount} credits)`;

  if (!amount) {
    return NextResponse.json({ error: "Refund amount is required." }, { status: 400 });
  }

  const result = await grantCreditsAtomic({
    userId: user.id,
    amount,
    description,
    adjustTotal: false,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Refund failed", code: result.code }, { status: 409 });
  }

  return NextResponse.json({ credits: result.creditsRemaining });
}
