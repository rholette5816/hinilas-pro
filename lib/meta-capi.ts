import crypto from "crypto";

export type MetaEventName = "ViewContent" | "CompleteRegistration" | "Purchase";

type RequestLike = {
  headers: Headers | { get(name: string): string | null };
  cookies?: { get(name: string): { value: string } | undefined };
};

type MetaEventOptions = {
  request?: RequestLike;
  eventName: MetaEventName;
  eventId: string;
  eventSourceUrl?: string;
  userData?: {
    email?: string | null;
    externalId?: string | null;
  };
  customData?: Record<string, unknown>;
};

function sha256(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function readHeader(request: RequestLike | undefined, name: string) {
  return request?.headers?.get(name) || null;
}

function readCookie(request: RequestLike | undefined, name: string) {
  const fromNextCookieStore = request?.cookies?.get?.(name)?.value;
  if (fromNextCookieStore) return fromNextCookieStore;

  const cookieHeader = readHeader(request, "cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function getClientIp(request: RequestLike | undefined) {
  const forwarded = readHeader(request, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return readHeader(request, "x-real-ip");
}

export async function sendMetaEvent({
  request,
  eventName,
  eventId,
  eventSourceUrl,
  userData,
  customData,
}: MetaEventOptions) {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const apiVersion = process.env.META_API_VERSION || "v22.0";

  if (!pixelId || !accessToken) return { ok: false, skipped: true as const };

  const email = userData?.email ? sha256(userData.email) : undefined;
  const externalId = userData?.externalId ? sha256(userData.externalId) : undefined;
  const clientIpAddress = getClientIp(request) || undefined;
  const clientUserAgent = readHeader(request, "user-agent") || undefined;
  const fbc = readCookie(request, "_fbc") || undefined;
  const fbp = readCookie(request, "_fbp") || undefined;

  const body = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: "website",
        user_data: {
          ...(email ? { em: [email] } : {}),
          ...(externalId ? { external_id: [externalId] } : {}),
          ...(clientIpAddress ? { client_ip_address: clientIpAddress } : {}),
          ...(clientUserAgent ? { client_user_agent: clientUserAgent } : {}),
          ...(fbc ? { fbc } : {}),
          ...(fbp ? { fbp } : {}),
        },
        ...(customData ? { custom_data: customData } : {}),
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Meta CAPI error:", errorText);
      return { ok: false, skipped: false as const };
    }

    return { ok: true, skipped: false as const };
  } catch (error) {
    console.error("Meta CAPI request failed:", error);
    return { ok: false, skipped: false as const };
  }
}
