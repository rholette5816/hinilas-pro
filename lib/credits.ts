import { createClient as createAdminClient } from "@supabase/supabase-js";

type DeductCreditsParams = {
  userId: string;
  amount: number;
  description: string;
  maxRetries?: number;
};

type GrantCreditsParams = {
  userId: string;
  amount: number;
  description: string;
  adjustTotal?: boolean;
  maxRetries?: number;
};

type CreditResult =
  | { ok: true; creditsRemaining: number; creditsTotal?: number }
  | { ok: false; code: "NO_CREDITS" | "NOT_FOUND" | "CONFLICT" | "ERROR"; error?: string };

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function deductCreditsAtomic({
  userId,
  amount,
  description,
  maxRetries = 5,
}: DeductCreditsParams): Promise<CreditResult> {
  const admin = adminClient();

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const { data: userData, error: readError } = await admin
      .from("user_data")
      .select("credits_remaining")
      .eq("user_id", userId)
      .single();

    if (readError) return { ok: false, code: "ERROR", error: readError.message };
    if (!userData) return { ok: false, code: "NOT_FOUND" };
    if (userData.credits_remaining < amount) return { ok: false, code: "NO_CREDITS" };

    const currentCredits = userData.credits_remaining;
    const nextCredits = currentCredits - amount;

    const { data: updatedRow, error: updateError } = await admin
      .from("user_data")
      .update({ credits_remaining: nextCredits })
      .eq("user_id", userId)
      .eq("credits_remaining", currentCredits)
      .select("credits_remaining")
      .maybeSingle();

    if (updateError) return { ok: false, code: "ERROR", error: updateError.message };
    if (!updatedRow) continue;

    const { error: transactionError } = await admin.from("credit_transactions").insert({
      user_id: userId,
      type: "use",
      amount: -amount,
      description,
    });

    if (transactionError) {
      await admin
        .from("user_data")
        .update({ credits_remaining: currentCredits })
        .eq("user_id", userId)
        .eq("credits_remaining", nextCredits);

      return { ok: false, code: "ERROR", error: transactionError.message };
    }

    return { ok: true, creditsRemaining: nextCredits };
  }

  return { ok: false, code: "CONFLICT" };
}

export async function grantCreditsAtomic({
  userId,
  amount,
  description,
  adjustTotal = true,
  maxRetries = 5,
}: GrantCreditsParams): Promise<CreditResult> {
  const admin = adminClient();

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    const { data: userData, error: readError } = await admin
      .from("user_data")
      .select("credits_remaining, credits_total")
      .eq("user_id", userId)
      .single();

    if (readError) return { ok: false, code: "ERROR", error: readError.message };
    if (!userData) return { ok: false, code: "NOT_FOUND" };

    const currentCredits = userData.credits_remaining ?? 0;
    const currentTotal = userData.credits_total ?? 0;
    const nextCredits = currentCredits + amount;
    const nextTotal = adjustTotal ? currentTotal + amount : currentTotal;

    const { data: updatedRow, error: updateError } = await admin
      .from("user_data")
      .update({ credits_remaining: nextCredits, credits_total: nextTotal })
      .eq("user_id", userId)
      .eq("credits_remaining", currentCredits)
      .eq("credits_total", currentTotal)
      .select("credits_remaining, credits_total")
      .maybeSingle();

    if (updateError) return { ok: false, code: "ERROR", error: updateError.message };
    if (!updatedRow) continue;

    const { error: transactionError } = await admin.from("credit_transactions").insert({
      user_id: userId,
      type: "grant",
      amount,
      description,
    });

    if (transactionError) {
      await admin
        .from("user_data")
        .update({ credits_remaining: currentCredits, credits_total: currentTotal })
        .eq("user_id", userId)
        .eq("credits_remaining", nextCredits)
        .eq("credits_total", nextTotal);

      return { ok: false, code: "ERROR", error: transactionError.message };
    }

    return { ok: true, creditsRemaining: nextCredits, creditsTotal: nextTotal };
  }

  return { ok: false, code: "CONFLICT" };
}
