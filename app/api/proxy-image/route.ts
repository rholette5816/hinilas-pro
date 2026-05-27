import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

const ALLOWED_PATH_PREFIXES = ["/storage/v1/object/public/ad-creative/"];
const FETCH_TIMEOUT_MS = 10000;

function getAllowedHosts() {
  const hosts = new Set<string>();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return hosts;

  try {
    hosts.add(new URL(supabaseUrl).hostname);
  } catch {
    // Fail closed if the env var is malformed.
  }

  return hosts;
}

export async function GET(req: NextRequest) {
  const ip = getRequestIp(req);
  const rl = checkRateLimit(`proxy-image:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (targetUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
  }

  const allowedHosts = getAllowedHosts();
  const allowedPath = ALLOWED_PATH_PREFIXES.some((prefix) =>
    targetUrl.pathname.startsWith(prefix)
  );

  if (!allowedHosts.has(targetUrl.hostname) || !allowedPath) {
    return NextResponse.json({ error: "Blocked url" }, { status: 403 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl.toString(), {
      signal: controller.signal,
      cache: "force-cache",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 415 });
    }

    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "attachment",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image fetch failed" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
