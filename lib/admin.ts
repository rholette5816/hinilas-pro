type OwnerLikeUser = {
  email?: string | null;
  user_metadata?: {
    role?: string;
    is_owner?: boolean;
  } | null;
};

export const OWNER_EMAILS = ["kevinrholette@gmail.com"];

export function isOwnerUser(user: OwnerLikeUser | null | undefined) {
  if (!user) return false;

  const email = user.email?.toLowerCase().trim();
  const metadata = user.user_metadata;

  return Boolean(
    (email && OWNER_EMAILS.includes(email)) ||
    metadata?.role === "owner" ||
    metadata?.is_owner === true
  );
}

export type Tier = "Lite" | "Flex" | "Max";

const VALID_LOCKED_TIERS: ReadonlyArray<Tier> = ["Lite", "Flex", "Max"];

function normalizeLockedTier(value: string | null | undefined): Tier | null {
  if (!value) return null;
  const titled = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  return (VALID_LOCKED_TIERS as ReadonlyArray<string>).includes(titled) ? (titled as Tier) : null;
}

function isLockActive(tierExpiresAt: string | Date | null | undefined): boolean {
  if (!tierExpiresAt) return false;
  const expiry = typeof tierExpiresAt === "string" ? new Date(tierExpiresAt) : tierExpiresAt;
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() > Date.now();
}

export function deriveTier(
  credits: number,
  lockedTier?: string | null,
  tierExpiresAt?: string | Date | null
): Tier {
  const normalizedLock = normalizeLockedTier(lockedTier ?? null);
  if (normalizedLock && isLockActive(tierExpiresAt ?? null)) {
    return normalizedLock;
  }
  if (credits >= 300) return "Max";
  if (credits >= 50) return "Flex";
  return "Lite";
}

// Backward-compat alias. New code should call deriveTier.
export function derivePlanFromCredits(credits: number) {
  return deriveTier(credits);
}
