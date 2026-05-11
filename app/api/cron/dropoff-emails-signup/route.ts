// Requires CRON_SECRET env var in Vercel

import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const maxDuration = 60;

const EMAIL_TYPE = "signup_to_action_nudge";
const REPLY_TO = "kevinrholette@gmail.com";
const APP_URL = "https://hinilas.pro";
const PAGE_SIZE = 1000;

type CreditTransactionRow = {
  user_id: string;
};

type EmailLogRow = {
  user_id: string;
};

type AuthUserRow = {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: {
    full_name?: string;
  } | null;
};

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function getFirstName(fullName?: string | null) {
  const firstName = fullName?.trim().split(/\s+/)[0] || "";
  return firstName;
}

function getSubject(firstName?: string) {
  return firstName
    ? `${firstName}, hindi mo pa nasimulan yung 30 free credits mo.`
    : "Hindi mo pa nasimulan yung 30 free credits mo.";
}

function getEmailHtml(firstName?: string) {
  const greetingLine = firstName ? `Hi ${firstName},` : "Hi,";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
      <p style="font-size: 16px; line-height: 1.6;">${greetingLine}</p>

      <p style="font-size: 16px; line-height: 1.6;">Pansin ko nag-sign up ka sa Hinilas Pro pero hindi mo pa nasisimulan yung 30 free credits mo.</p>

      <p style="font-size: 16px; line-height: 1.6;">Madali lang. 1 minuto para sa Setup form, then automatic na yung research, angles, image, at copy mo. Generated ng AI base sa business mo.</p>

      <p style="font-size: 16px; line-height: 1.6;"><strong>Yung 30 credits mo - bonus yan.</strong> Hindi mo na kailangan magbayad para malaman kung anong angles ang pwedeng kumita sa product mo.</p>

      <p style="margin: 32px 0;">
        <a href="${APP_URL}" style="display: inline-block; background: #D97706; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Start Setup Now &rarr;</a>
      </p>

      <p style="font-size: 16px; line-height: 1.6;">Kung may tanong ka or stuck ka kahit saan, reply ka lang dito. Sagot ko personally.</p>

      <p style="font-size: 16px; line-height: 1.6;">- Ken<br/><span style="color: #6B7280; font-size: 14px;">Founder, Hinilas Pro</span></p>

      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />

      <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5;">You're receiving this because you signed up for Hinilas Pro and haven't started using your credits. <a href="${APP_URL}/home" style="color: #9CA3AF;">Visit your dashboard</a>.</p>
    </div>
  `;
}

async function fetchPagedRows<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>
) {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const page = await fetchPage(from, from + PAGE_SIZE - 1);
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAllEligibleUsers(
  admin: ReturnType<typeof adminClient>,
  cutoffIso: string
) {
  const users: AuthUserRow[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const pageUsers = (data.users || []) as AuthUserRow[];
    const eligibleUsers = pageUsers.filter((user) => {
      const createdAt = user.created_at;
      return createdAt ? createdAt <= cutoffIso : false;
    });

    users.push(...eligibleUsers);

    if (pageUsers.length < PAGE_SIZE) break;
    page += 1;
  }

  return users;
}

async function fetchUserIdSetByFilter(
  admin: ReturnType<typeof adminClient>,
  table: "credit_transactions" | "email_log"
) {
  if (table === "credit_transactions") {
    const rows = await fetchPagedRows<CreditTransactionRow>(async (from, to) => {
      const { data, error } = await admin
        .from("credit_transactions")
        .select("user_id")
        .eq("type", "use")
        .range(from, to);

      if (error) throw new Error(`Failed to fetch used-credit transactions: ${error.message}`);
      return data || [];
    });

    return new Set(rows.map((row) => row.user_id));
  }

  const rows = await fetchPagedRows<EmailLogRow>(async (from, to) => {
    const { data, error } = await admin
      .from("email_log")
      .select("user_id")
      .eq("email_type", EMAIL_TYPE)
      .range(from, to);

    if (error) throw new Error(`Failed to fetch email log rows: ${error.message}`);
    return data || [];
  });

  return new Set(rows.map((row) => row.user_id));
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return unauthorized();
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ processed: 0, skipped: 0, errors: ["Missing RESEND_API_KEY"] }, { status: 500 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ processed: 0, skipped: 0, errors: ["Missing Supabase admin env vars"] }, { status: 500 });
  }

  const admin = adminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const cutoffIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const errors: string[] = [];

  try {
    const [eligibleUsers, usedCreditUserIds, emailedUserIds] = await Promise.all([
      fetchAllEligibleUsers(admin, cutoffIso),
      fetchUserIdSetByFilter(admin, "credit_transactions"),
      fetchUserIdSetByFilter(admin, "email_log"),
    ]);

    const candidateUsers = eligibleUsers.filter(
      (user) => !usedCreditUserIds.has(user.id) && !emailedUserIds.has(user.id)
    );

    let processed = 0;
    let skipped = 0;
    let firstSend = true;

    for (const user of candidateUsers) {
      if (!firstSend) await new Promise((r) => setTimeout(r, 600));
      firstSend = false;
      try {
        const email = user.email?.trim();

        if (!email) {
          skipped += 1;
          continue;
        }

        const firstName = getFirstName(user.user_metadata?.full_name);

        const sendResult = await resend.emails.send({
          from: "Ken from Hinilas Pro <ken@hinilas.pro>",
          to: email,
          replyTo: REPLY_TO,
          subject: getSubject(firstName),
          html: getEmailHtml(firstName),
        });

        if (sendResult.error) {
          throw new Error(`Resend failed for ${user.id}: ${sendResult.error.message}`);
        }

        const { error: logError } = await admin.from("email_log").insert({
          user_id: user.id,
          email_type: EMAIL_TYPE,
        });

        if (logError) {
          throw new Error(`email_log insert failed for ${user.id}: ${logError.message}`);
        }

        processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unknown error for ${user.id}`;
        errors.push(message);
      }
    }

    return NextResponse.json({ processed, skipped, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron error";
    return NextResponse.json({ processed: 0, skipped: 0, errors: [message] }, { status: 500 });
  }
}
