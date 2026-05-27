import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.redirect(new URL("/pitch.html", process.env.NEXT_PUBLIC_SITE_URL || "https://hinilas.pro"), 302);
}
