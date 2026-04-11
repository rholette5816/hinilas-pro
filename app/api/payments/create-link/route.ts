import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLAN_CONFIG = {
  pro: { amount: 99900, name: "Hinilas Pro — ₱999/month", credits: 150 },
  max: { amount: 249900, name: "Hinilas Max — ₱2,499/month", credits: 500 },
  topup: { amount: 49900, name: "Hinilas Top-up — 50 Credits", credits: 50 },
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { plan } = await req.json() as { plan: "pro" | "max" | "topup" };
  const config = PLAN_CONFIG[plan];
  if (!config) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "PayMongo not configured" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hinilas.pro";
  const encoded = Buffer.from(secretKey).toString("base64");

  try {
    const res = await fetch("https://api.paymongo.com/v1/links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encoded}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: config.amount,
            description: config.name,
            remarks: `${plan}|${user.id}`,
            redirect: {
              success: `${baseUrl}/pricing/success?plan=${plan}`,
              failed: `${baseUrl}/pricing/cancel`,
            },
          },
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.errors?.[0]?.detail || "PayMongo error" }, { status: 500 });
    }

    const checkoutUrl = data.data?.attributes?.checkout_url;
    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
