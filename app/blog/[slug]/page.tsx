import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { HinilasIcon } from "@/components/HinilasLogo";

async function getPost(slug: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const admin = createClient(url, key);
    const { data } = await admin
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: `${post.title} | Kuya Ken`,
    description: post.meta_description,
    openGraph: {
      title: post.title,
      description: post.meta_description,
      url: `https://www.hinilas.pro/blog/${slug}`,
      siteName: "Hinilas Pro",
      type: "article",
      ...(post.hero_image_url && { images: [{ url: post.hero_image_url, width: 1200, height: 630 }] }),
    },
  };
}

function renderArticle(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("# "))
      return <h1 key={i} className="text-3xl font-bold text-white mt-10 mb-4">{line.slice(2)}</h1>;
    if (line.startsWith("## "))
      return <h2 key={i} className="text-2xl font-bold text-white mt-8 mb-3">{line.slice(3)}</h2>;
    if (line.startsWith("### "))
      return <h3 key={i} className="text-lg font-semibold text-white mt-6 mb-2">{line.slice(4)}</h3>;
    if (line.startsWith("- ") || line.startsWith("* "))
      return (
        <li key={i} className="ml-5 text-sm leading-relaxed" style={{ color: "#94A3B8", listStyleType: "disc" }}>
          {line.slice(2)}
        </li>
      );
    if (line.startsWith("**") && line.endsWith("**"))
      return <p key={i} className="font-semibold text-white mt-4">{line.slice(2, -2)}</p>;
    if (line.trim() === "") return <div key={i} className="h-3" />;
    return (
      <p key={i} className="text-sm leading-relaxed" style={{ color: "#94A3B8" }}>
        {line}
      </p>
    );
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen" style={{ background: "#0B1120" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "#1E2D45" }}>
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
            <HinilasIcon size="sm" />
            <span className="text-white font-semibold text-sm">Hinilas Pro</span>
          </Link>
          <Link href="/blog" className="text-xs hover:text-white transition-colors" style={{ color: "#64748B" }}>
            ← All Posts
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14">
        {/* Meta */}
        <div className="mb-8">
          <p className="text-xs mb-3" style={{ color: "#64748B" }}>
            {new Date(post.published_at).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="text-3xl font-bold text-white leading-snug mb-4">
            {post.title}
          </h1>
          {post.meta_description && (
            <p className="text-base" style={{ color: "#64748B" }}>
              {post.meta_description}
            </p>
          )}
        </div>

        {/* Hero Image */}
        {post.hero_image_url && (
          <div className="mb-10 rounded-xl overflow-hidden border" style={{ borderColor: "#1E2D45" }}>
            <img
              src={post.hero_image_url}
              alt={post.title}
              className="w-full object-cover"
              style={{ aspectRatio: "1200/630" }}
            />
          </div>
        )}

        {/* Divider */}
        <div className="mb-10 h-px" style={{ background: "#1E2D45" }} />

        {/* Article */}
        <article className="flex flex-col gap-3">
          {renderArticle(post.article)}
        </article>

        {/* CTA Block */}
        {post.cta && (
          <div
            className="mt-14 rounded-2xl p-8"
            style={{ background: "rgba(43,126,201,0.08)", border: "1px solid rgba(43,126,201,0.3)" }}
          >
            <div
              className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4"
              style={{ background: "rgba(43,126,201,0.15)", color: "#2B7EC9", border: "1px solid rgba(43,126,201,0.3)" }}
            >
              Try Hinilas Pro
            </div>
            <p className="text-white font-semibold text-lg mb-2">Gusto mo ng shortcut?</p>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "#94A3B8" }}>
              {post.cta.replace(/Try it (now )?at https?:\/\/[^\s]+/gi, "").trim()}
            </p>
            <a
              href="https://www.hinilas.pro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block font-semibold px-6 py-3 rounded-xl text-white text-sm transition-opacity hover:opacity-90"
              style={{ background: "#2B7EC9" }}
            >
              Try Hinilas Pro — Free
            </a>
          </div>
        )}

        {/* Back link */}
        <div className="mt-10">
          <Link href="/blog" className="text-xs transition-colors hover:text-white" style={{ color: "#64748B" }}>
            ← Back to all posts
          </Link>
        </div>
      </div>
    </main>
  );
}
