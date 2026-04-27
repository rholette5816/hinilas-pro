// Requires CRON_SECRET env var in Vercel

import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const maxDuration = 60;

const EMAIL_TYPE = "research_to_angles_nudge";
const REPLY_TO = "kevinrholette@gmail.com";
const APP_URL = "https://hinilas.pro";
const PAGE_SIZE = 1000;

type CreditTransactionRow = {
  user_id: string;
  created_at: string;
};

type EmailLogRow = {
  user_id: string;
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
  const name = firstName || "Hi";
  return `${name}, you did the hard part. Angles takes 1 minute.`;
}

function getEmailHtml(firstName?: string) {
  const greetingLine = firstName ? `Hi ${firstName},` : "Hi,";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1F2937;">
      <p style="font-size: 16px; line-height: 1.6;">${greetingLine}</p>

      <p style="font-size: 16px; line-height: 1.6;">Pansin ko nag-research ka na sa Hinilas Pro pero hindi ka pa nakakapag-generate ng angles.</p>

      <p style="font-size: 16px; line-height: 1.6;">Sayang yung research mo kung di mo gagamitin. Ang totoo, doon mismo nakatago yung mga winning angles na pwede mong i-launch agad.</p>

      <p style="font-size: 16px; line-height: 1.6;"><strong>1 minuto lang.</strong> Pindutin mo lang yung button at automatic generated yung angles based sa research mo.</p>

      <p style="margin: 32px 0;">
        <a href="${APP_URL}/angles" style="display: inline-block; background: #F5A623; color: #000; font-weight: bold; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 14px;">Generate My Angles &rarr;</a>
      </p>

      <p style="font-size: 16px; line-height: 1.6;">Kung may tanong ka, reply ka lang dito. Sagot ko personally.</p>

      <p style="font-size: 16px; line-height: 1.6;">- Ken<br/><span style="color: #6B7280; font-size: 14px;">Founder, Hinilas Pro</span></p>

      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 32px 0 16px;" />

      <p style="font-size: 12px; color: #9CA3AF; line-height: 1.5;">You're receiving this because you signed up for Hinilas Pro and haven't completed your campaign workflow. <a href="${APP_URL}/home" style="color: #9CA3AF;">Visit your dashboard</a>.</p>
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

async function fetchLatestResearchTransactions(admin: ReturnType<typeof adminClient>) {
  const rows = await fetchPagedRows<CreditTransactionRow>(async (from, to) => {
    const { data, error } = await admin
      .from("credit_transactions")
      .select("user_id, created_at")
      .eq("type", "use")
      .eq("description", "Research generation")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Failed to fetch research transactions: ${error.message}`);
    return data || [];
  });

  const latestByUser = new Map<string, string>();

  for (const row of rows) {
    if (!latestByUser.has(row.user_id)) {
      latestByUser.set(row.user_id, row.created_at);
    }
  }

  return latestByUser;
}

async function fetchUserIdSetByFilter(
  admin: ReturnType<typeof adminClient>,
  table: "credit_transactions" | "email_log"
) {
  if (table === "credit_transactions") {
    const rows = await fetchPagedRows<CreditTransactionRow>(async (from, to) => {
      const { data, error } = await admin
        .from("credit_transactions")
        .select("user_id, created_at")
        .eq("type", "use")
        .ilike("description", "Angles%")
        .range(from, to);

      if (error) throw new Error(`Failed to fetch angles transactions: ${error.message}`);
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
    const [latestResearchByUser, anglesUserIds, emailedUserIds] = await Promise.all([
      fetchLatestResearchTransactions(admin),
      fetchUserIdSetByFilter(admin, "credit_transactions"),
      fetchUserIdSetByFilter(admin, "email_log"),
    ]);

    const candidateUserIds = Array.from(latestResearchByUser.entries())
      .filter(([, createdAt]) => createdAt <= cutoffIso)
      .map(([userId]) => userId)
      .filter((userId) => !anglesUserIds.has(userId) && !emailedUserIds.has(userId));

    let processed = 0;
    let skipped = 0;

    for (const userId of candidateUserIds) {
      try {
        const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);

        if (userError) {
          throw new Error(`User lookup failed for ${userId}: ${userError.message}`);
        }

        const user = userData.user;
        const email = user?.email?.trim();

        if (!user || !email) {
          skipped += 1;
          continue;
        }

        const firstName = getFirstName(user.user_metadata?.full_name as string | undefined);

        const sendResult = await resend.emails.send({
          from: "Ken from Hinilas Pro <onboarding@resend.dev>",
          to: email,
          replyTo: REPLY_TO,
          subject: getSubject(firstName),
          html: getEmailHtml(firstName),
        });

        if (sendResult.error) {
          throw new Error(`Resend failed for ${userId}: ${sendResult.error.message}`);
        }

        const { error: logError } = await admin.from("email_log").insert({
          user_id: userId,
          email_type: EMAIL_TYPE,
        });

        if (logError) {
          throw new Error(`email_log insert failed for ${userId}: ${logError.message}`);
        }

        processed += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unknown error for ${userId}`;
        errors.push(message);
      }
    }

    return NextResponse.json({ processed, skipped, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron error";
    return NextResponse.json({ processed: 0, skipped: 0, errors: [message] }, { status: 500 });
  }
}
