import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Metadata } from "next";

export const revalidate = 60;

interface BlogPost {
  slug: string;
  title: string;
  meta_description: string | null;
  published_at: string | null;
}

export const metadata: Metadata = {
  title: "Blog | Hinilas Pro",
  description: "Meta Ads strategy, eCommerce tips, and business insights for Filipino sellers and ad operators.",
};

async function getPosts(): Promise<BlogPost[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const admin = createClient(url, key);
    const { data } = await admin
      .from("blog_posts")
      .select("slug, title, meta_description, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

function LogoMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#1C1E21" />
      <line x1="14" y1="10" x2="14" y2="38" stroke="#0866FF" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="34" y1="10" x2="34" y2="38" stroke="#0866FF" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="14" y1="24" x2="34" y2="24" stroke="#0866FF" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="14" cy="10" r="3" fill="#D97706" />
      <circle cx="14" cy="38" r="3" fill="#0866FF" />
      <circle cx="34" cy="10" r="3" fill="#0866FF" />
      <circle cx="34" cy="38" r="3" fill="#D97706" />
    </svg>
  );
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="min-h-screen" style={{ background: "#F0F2F5", color: "#1C1E21" }}>
      <div className="border-b bg-white" style={{ borderColor: "#E4E6EB" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/home" className="flex items-center gap-3 transition-opacity hover:opacity-85">
            <LogoMark />
            <div className="leading-tight">
              <span className="text-sm font-black text-slate-900">Hinilas Pro</span>
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "#0866FF" }}>Marketing library</p>
            </div>
          </Link>
          <Link
            href="/home"
            className="rounded-xl px-4 py-2 text-xs font-bold transition-colors hover:bg-blue-700"
            style={{ background: "#0866FF", color: "#FFFFFF" }}
          >
            Start free
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 max-w-2xl">
          <div
            className="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
            style={{ background: "#EAF4FF", color: "#0866FF", border: "1px solid #BFDBFE" }}
          >
            Hinilas Pro Blog
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Clear Meta Ads thinking for serious sellers.
          </h1>
          <p className="max-w-xl text-base leading-7" style={{ color: "#65676B" }}>
            Practical notes on offers, angles, creative direction, and business strategy from the Hinilas Pro team.
          </p>
        </div>

        {posts.length === 0 ? (
          <div
            className="rounded-2xl border bg-white p-10 text-center"
            style={{ borderColor: "#E4E6EB" }}
          >
            <p className="text-sm font-semibold" style={{ color: "#65676B" }}>
              No posts yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl border bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/70"
                style={{ borderColor: "#E4E6EB" }}
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#65676B" }}>
                      {post.published_at ? new Date(post.published_at).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "Asia/Manila",
                      }) : "Unpublished"}
                    </p>
                    <h2 className="mb-2 text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-blue-700">
                      {post.title}
                    </h2>
                    {post.meta_description && (
                      <p className="text-sm leading-7" style={{ color: "#65676B" }}>
                        {post.meta_description}
                      </p>
                    )}
                  </div>
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black transition-colors group-hover:bg-blue-600 group-hover:text-white"
                    style={{ background: "#EAF4FF", color: "#0866FF" }}
                  >
                    Go
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div
          className="mt-16 rounded-2xl px-8 py-10 text-center"
          style={{ background: "#1C1E21", color: "#FFFFFF" }}
        >
          <p className="mb-2 text-xl font-black">Want a faster ad workflow?</p>
          <p className="mx-auto mb-6 max-w-xl text-sm leading-7" style={{ color: "#CBD5E1" }}>
            Hinilas Pro turns your business profile into research, ad angles, sales copy, and creative direction.
          </p>
          <Link
            href="/home"
            className="inline-block rounded-xl px-6 py-3 text-sm font-black transition-all hover:brightness-105"
            style={{ background: "#D97706", color: "#111827" }}
          >
            Try Hinilas Pro free
          </Link>
        </div>
      </div>
    </main>
  );
}
