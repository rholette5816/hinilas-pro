import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import crypto from "crypto";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Facebook sends a signed_request param. We parse it to get the user's Facebook ID.
function parseSignedRequest(signedRequest: string, appSecret: string): { user_id: string } | null {
  try {
    const [encodedSig, payload] = signedRequest.split(".");
    const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const expectedSig = crypto.createHmac("sha256", appSecret).update(payload).digest();
    if (!crypto.timingSafeEqual(sig, expectedSig)) return null;
    return JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const signedRequest = body.get("signed_request") as string;

  if (!signedRequest) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const parsed = parseSignedRequest(signedRequest, appSecret);

  if (!parsed?.user_id) {
    return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });
  }

  const facebookUserId = parsed.user_id;

  // Find users in Supabase who logged in with this Facebook account
  const admin = adminClient();
  const { data: users } = await admin.auth.admin.listUsers();

  const matchedUser = users?.users?.find(
    (u) => u.app_metadata?.provider === "facebook" && u.app_metadata?.provider_id === facebookUserId
  );

  if (matchedUser) {
    // Delete all user data
    await admin.from("user_data").delete().eq("user_id", matchedUser.id);
    await admin.from("credit_transactions").delete().eq("user_id", matchedUser.id);
    await admin.from("feedbacks").delete().eq("user_id", matchedUser.id);
    await admin.from("community_messages").delete().eq("user_id", matchedUser.id);
    await admin.from("top_up_requests").delete().eq("user_id", matchedUser.id);
    await admin.auth.admin.deleteUser(matchedUser.id);
  }

  // Return confirmation URL (Facebook requires this format)
  const confirmationCode = `fb_del_${facebookUserId}_${Date.now()}`;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/data-deletion?code=${confirmationCode}`;

  return NextResponse.json({
    url,
    confirmation_code: confirmationCode,
  });
}
