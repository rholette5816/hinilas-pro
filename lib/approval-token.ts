import { createHmac, timingSafeEqual } from "node:crypto";

type ApprovalTokenPayload = {
  id: string;
  exp: number;
};

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function generateApprovalToken(id: string): string {
  const secret = process.env.TOPUP_WEBHOOK_SECRET;
  if (!secret) throw new Error("TOPUP_WEBHOOK_SECRET is not configured");

  const payload = base64url(JSON.stringify({ id, exp: Date.now() + 15 * 60 * 1000 }));
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyApprovalToken(token: string): string | null {
  const secret = process.env.TOPUP_WEBHOOK_SECRET;
  if (!secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = signPayload(payload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ApprovalTokenPayload;
    if (!decoded.id || decoded.exp < Date.now()) return null;
    return decoded.id;
  } catch {
    return null;
  }
}
