import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deductCreditsAtomic, grantCreditsAtomic } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`consultations:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { topic, preferred_date, preferred_time } = await req.json();

  if (!topic || !preferred_date || !preferred_time) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const deduction = await deductCreditsAtomic({
    userId: user.id,
    amount: 100,
    description: "Live consultation booking",
  });

  if (!deduction.ok) {
    if (deduction.code === "NO_CREDITS") {
      return NextResponse.json({ error: "Not enough credits", code: "NO_CREDITS" }, { status: 402 });
    }
    return NextResponse.json({ error: "Credit update failed", code: deduction.code }, { status: 409 });
  }

  const { data: booking, error } = await supabase
    .from("consultations")
    .insert({
      user_id: user.id,
      user_email: user.email,
      topic,
      preferred_date,
      preferred_time,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    await grantCreditsAtomic({
      userId: user.id,
      amount: 100,
      description: "Consultation booking refund",
      adjustTotal: false,
    });
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }

  return NextResponse.json({ booking, credits: deduction.creditsRemaining });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = checkRateLimit(`consultations:${user.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { data } = await supabase
    .from("consultations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ consultations: data || [] });
}
