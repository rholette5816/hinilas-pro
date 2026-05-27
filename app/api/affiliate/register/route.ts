import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/affiliate";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`affiliate-register:${ip}`, { limit: 3, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gcashNumber, gcashName } = await req.json();
  const cleanNumber = String(gcashNumber || "").replace(/\D/g, "");
  const cleanName = String(gcashName || "").trim();

  if (!/^09\d{9}$/.test(cleanNumber)) {
    return NextResponse.json({ error: "Enter a valid 11-digit GCash number" }, { status: 400 });
  }

  if (cleanName.length < 2) {
    return NextResponse.json({ error: "Enter the full GCash account name" }, { status: 400 });
  }

  const admin = adminClient();

  const { data: existingUserAffiliate } = await admin
    .from("affiliates")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingUserAffiliate) {
    return NextResponse.json({ error: "Already registered" }, { status: 400 });
  }

  const { data: existingGcashAffiliate } = await admin
    .from("affiliates")
    .select("id")
    .eq("gcash_number", cleanNumber)
    .maybeSingle();

  if (existingGcashAffiliate) {
    return NextResponse.json({ error: "GCash number already registered to another account" }, { status: 400 });
  }

  const { error } = await admin.from("affiliates").insert({
    user_id: user.id,
    gcash_number: cleanNumber,
    gcash_name: cleanName,
    status: "active",
    rank: "Partner",
  });

  if (error) {
    console.error("[affiliate-register] affiliate insert error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
