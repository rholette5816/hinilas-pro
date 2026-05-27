import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`testimonial:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const { name, rating, message, mediaUrl } = await req.json();

  if (!name?.trim() || !message?.trim() || !rating) {
    return NextResponse.json({ error: "Name, rating, and message are required." }, { status: 400 });
  }

  const admin = adminClient();

  await admin.from("feedbacks").insert({
    user_id: null,
    user_name: name.trim(),
    user_avatar: null,
    user_email: null,
    rating,
    category: "Testimonial",
    message: message.trim(),
    video_url: mediaUrl || null,
  });

  return NextResponse.json({ success: true });
}
