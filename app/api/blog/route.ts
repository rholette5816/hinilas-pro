import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.HINILAS_BLOG_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, slug, meta_description, article, cta, hero_image_url } = await req.json();

  if (!title || !slug || !article) {
    return NextResponse.json({ error: "title, slug, and article are required" }, { status: 400 });
  }

  const admin = adminClient();

  const { error } = await admin.from("blog_posts").upsert(
    {
      slug,
      title,
      meta_description: meta_description || "",
      article,
      cta: cta || "",
      hero_image_url: hero_image_url || "",
      status: "published",
      published_at: new Date().toISOString(),
    },
    { onConflict: "slug" }
  );

  if (error) {
    console.error("[blog] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, slug });
}

export async function GET(req: NextRequest) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("blog_posts")
    .select("slug, title, meta_description, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}
