import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { sendMetaEvent } from "@/lib/meta-capi";

const WELCOME_EMAIL_TYPE = "welcome";
const WELCOME_EMAIL_REPLY_TO = "kevinrholette@gmail.com";
const APP_URL = "https://hinilas.pro";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const response = NextResponse.redirect(`${origin}/loading-screen`);

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
      credits_remaining: 15,
      credits_total: 15,
      plan: "lite",
      referral_code: referralCode,
      referred_by: referredBy,
      referral_rewarded: false,
      welcome_drip_granted: false,
      username,
      avatar_url,
    }, { onConflict: "user_id" });

    await adminSupabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "grant",
      amount: 15,
      description: "Welcome credits - 15 free credits on signup (15 more after first generation)",
    });

    await sendMetaEvent({
      request,
      eventName: "CompleteRegistration",
      eventId: `complete-registration-${user.id}`,
      eventSourceUrl: `${new URL(request.url).origin}/home`,
      userData: {
        email: user.email || null,
        externalId: user.id,
      },
      customData: {
        status: "completed",
      },
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

    try {
      const { data: existingWelcomeEmail, error: existingWelcomeEmailError } = await adminSupabase
        .from("email_log")
        .select("id")
        .eq("user_id", user.id)
        .eq("email_type", WELCOME_EMAIL_TYPE)
        .limit(1)
        .maybeSingle();

      if (existingWelcomeEmailError) {
        throw new Error(existingWelcomeEmailError.message);
      }

      if (!existingWelcomeEmail && user.email) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const firstName = getFirstName(user.user_metadata?.full_name as string | undefined);

        const sendResult = await resend.emails.send({
          from: "Ken from Hinilas Pro <ken@hinilas.pro>",
          to: user.email,
          replyTo: WELCOME_EMAIL_REPLY_TO,
          subject: getWelcomeEmailSubject(firstName),
          html: getWelcomeEmailHtml(firstName),
        });

        if (sendResult.error) {
          throw new Error(sendResult.error.message);
        }

        const { error: insertWelcomeEmailError } = await adminSupabase.from("email_log").insert({
          user_id: user.id,
          email_type: WELCOME_EMAIL_TYPE,
        });

        if (insertWelcomeEmailError) {
          throw new Error(insertWelcomeEmailError.message);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown welcome email error";
      console.error("[welcome-email]", { userId: user.id, message });
    }
  } else if (!existing.referral_code) {
    // Existing user missing referral code — backfill it
    await adminSupabase.from("user_data").update({ referral_code: referralCode }).eq("user_id", user.id);
  }
}

function getFirstName(fullName?: string | null) {
  return fullName?.trim().split(/\s+/)[0] || "";
}

function getWelcomeEmailSubject(firstName?: string) {
  return firstName
    ? `Welcome to Hinilas Pro, ${firstName}. Here's how to start.`
    : "Welcome to Hinilas Pro. Here's how to start.";
}

function getWelcomeEmailHtml(firstName?: string) {
  const greetingLine = firstName ? `Hi ${firstName},` : "Hi,";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
      <p style="font-size: 16px; line-height: 1.6;">${greetingLine}</p>

      <p style="font-size: 16px; line-height: 1.6;">Welcome sa Hinilas Pro. Si Ken ito - yung gumawa ng tool na ginagamit mo ngayon.</p>

      <p style="font-size: 16px; line-height: 1.6;">Binigyan kita ng <strong>15 free credits</strong> para masimulan mo agad. Pag nag-generate ka ng kahit ano (research, angle, copy, o image), automatic na may dagdag pang <strong>15 credits</strong> - total 30 free credits para sa simula mo.</p>

      <p style="font-size: 16px; line-height: 1.6;"><strong>Eto yung 4 na step na susundan mo:</strong></p>

      <ol style="font-size: 16px; line-height: 1.8; padding-left: 20px;">
        <li>Punan mo yung Setup form (1 minuto lang)</li>
        <li>I-run mo yung Market Research (1 credit)</li>
        <li>Pumili ng winning angle (1 credit)</li>
        <li>Generate yung ad image at copy</li>
      </ol>

      <p style="font-size: 16px; line-height: 1.6;">Pag tapos mo yung 4 steps, may complete campaign assets ka na - ready i-launch sa Meta Ads.</p>

      <p style="margin: 32px 0;">
        <a href="${APP_URL}" style="display: inline-block; background: #F5A623; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Start Setup Now &rarr;</a>
      </p>

      <p style="font-size: 16px; line-height: 1.6;">Kung may tanong ka, reply ka lang dito. Sagot ko personally.</p>

      <p style="font-size: 16px; line-height: 1.6;">- Ken<br/><span style="color: #6B7280; font-size: 14px;">Founder, Hinilas Pro</span></p>

      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />

      <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5;">You're receiving this because you signed up for Hinilas Pro at <a href="${APP_URL}/home" style="color: #9CA3AF;">hinilas.pro</a>.</p>
    </div>
  `;
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
