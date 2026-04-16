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

export function derivePlanFromCredits(credits: number) {
  if (credits >= 300) return "Max";
  if (credits >= 50) return "Flex";
  return "Lite";
}
