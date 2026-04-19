import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Metadata } from "next";
import { HinilasIcon } from "@/components/HinilasLogo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog | Kuya Ken",
  description: "Meta Ads strategy, eCommerce tips, and business insights from Kuya Ken — operator, strategist, Filipino entrepreneur.",
};

async function getPosts() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
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

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="min-h-screen" style={{ background: "#0B1120" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "#1E2D45" }}>
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <HinilasIcon size="sm" />
            <span className="text-white font-semibold text-sm">Hinilas Pro</span>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-14">
          <div
            className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4"
            style={{ background: "rgba(43,126,201,0.15)", color: "#2B7EC9", border: "1px solid rgba(43,126,201,0.3)" }}
          >
            Kuya Ken — Blog
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Real talk. No fluff.
          </h1>
          <p style={{ color: "#94A3B8" }} className="text-base max-w-lg">
            Meta Ads strategy, eCommerce, and business insights from the operator himself.
          </p>
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div
            className="rounded-2xl p-10 text-center"
            style={{ background: "#0A0F1A", border: "1px solid #1E2D45" }}
          >
            <p style={{ color: "#64748B" }}>No posts yet. Check back soon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post: any, i: number) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl p-6 transition-all"
                style={{
                  background: "#0A0F1A",
                  border: "1px solid #1E2D45",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#2B7EC9")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E2D45")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-xs mb-2" style={{ color: "#64748B" }}>
                      {new Date(post.published_at).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <h2 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h2>
                    {post.meta_description && (
                      <p className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
                        {post.meta_description}
                      </p>
                    )}
                  </div>
                  <div
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                    style={{ background: "rgba(43,126,201,0.15)", color: "#2B7EC9" }}
                  >
                    →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div
          className="mt-16 rounded-2xl p-8 text-center"
          style={{ background: "rgba(43,126,201,0.08)", border: "1px solid rgba(43,126,201,0.25)" }}
        >
          <p className="text-white font-semibold text-lg mb-2">Gusto mo ng shortcut?</p>
          <p className="text-sm mb-6" style={{ color: "#94A3B8" }}>
            Hinilas Pro — the AI tool built for Filipino Meta Ads operators and sellers.
          </p>
          <a
            href="https://www.hinilas.pro"
            className="inline-block font-semibold px-6 py-3 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ background: "#2B7EC9" }}
          >
            Try Hinilas Pro — Free
          </a>
        </div>
      </div>
    </main>
  );
}
