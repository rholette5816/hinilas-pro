import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const response = NextResponse.redirect(`${origin}/`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Handle OAuth code (Google login)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await handlePostAuth(supabase, request);
      return response;
    }
  }

  // Handle email confirmation link
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as "email" | "signup" | "recovery" });
    if (!error) {
      await handlePostAuth(supabase, request);
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/home`);
}

async function handlePostAuth(supabase: ReturnType<typeof import("@supabase/ssr").createServerClient>, request: import("next/server").NextRequest) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check if user_data row exists
  const { data: existing } = await adminSupabase
    .from("user_data")
    .select("referral_code, referred_by, credits_remaining")
    .eq("user_id", user.id)
    .single();

  const referralCode = existing?.referral_code || generateCode(user.id);
  const referredBy = existing?.referred_by || getCookie(request, "referral_code") || null;
  const isNew = !existing;

  if (isNew) {
    // New user — grant 30 signup credits, save referral info + username
    const username = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
    const avatar_url = user.user_metadata?.avatar_url || null;
    await adminSupabase.from("user_data").upsert({
      user_id: user.id,
      credits_remaining: 30,
      credits_total: 30,
      plan: "lite",
      referral_code: referralCode,
      referred_by: referredBy,
      referral_rewarded: false,
      username,
      avatar_url,
    }, { onConflict: "user_id" });

    await adminSupabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "grant",
      amount: 30,
      description: "Welcome credits — 30 free credits on signup",
    });

    // Grant 5 credits to referrer on signup
    if (referredBy) {
      const { data: referrer } = await adminSupabase
        .from("user_data")
        .select("user_id, credits_remaining, credits_total")
        .eq("referral_code", referredBy)
        .single();

      if (referrer) {
        await adminSupabase.from("user_data").update({
          credits_remaining: referrer.credits_remaining + 12,
          credits_total: referrer.credits_total + 12,
        }).eq("user_id", referrer.user_id);

        await adminSupabase.from("credit_transactions").insert({
          user_id: referrer.user_id,
          type: "referral",
          amount: 12,
          description: "Referral reward — new signup via your link",
        });
      }
    }
  } else if (!existing.referral_code) {
    // Existing user missing referral code — backfill it
    await adminSupabase.from("user_data").update({ referral_code: referralCode }).eq("user_id", user.id);
  }
}

function generateCode(userId: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const seed = userId.replace(/-/g, "");
  for (let i = 0; i < 8; i++) {
    const idx = parseInt(seed.slice(i * 2, i * 2 + 2), 16) % chars.length;
    code += chars[idx];
  }
  return code;
}

function getCookie(request: import("next/server").NextRequest, name: string): string | null {
  return request.cookies.get(name)?.value || null;
}
