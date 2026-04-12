import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic, preferred_date, preferred_time } = await req.json();

  if (!topic || !preferred_date || !preferred_time) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Check credits
  const { data: userData } = await supabase
    .from("user_data")
    .select("credits_remaining")
    .eq("user_id", user.id)
    .single();

  if (!userData || userData.credits_remaining < 100) {
    return NextResponse.json({ error: "Not enough credits", code: "NO_CREDITS" }, { status: 402 });
  }

  // Deduct 100 credits
  const newCredits = userData.credits_remaining - 100;
  await supabase.from("user_data").update({ credits_remaining: newCredits }).eq("user_id", user.id);
  await supabase.from("credit_transactions").insert({
    user_id: user.id,
    type: "use",
    amount: -100,
    description: "Live consultation booking",
  });

  // Save booking
  const { data: booking, error } = await supabase.from("consultations").insert({
    user_id: user.id,
    user_email: user.email,
    topic,
    preferred_date,
    preferred_time,
    status: "pending",
  }).select().single();

  if (error) return NextResponse.json({ error: "Booking failed" }, { status: 500 });

  return NextResponse.json({ booking, credits: newCredits });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("consultations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ consultations: data || [] });
}
