import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";

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
    title: `${post.title} | Hinilas Pro`,
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

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-blue-300 underline-offset-4 transition-colors hover:text-blue-800"
        style={{ color: "#0866FF" }}
      >
        {part}
      </a>
    ) : part
  );
}

function renderArticle(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("# ")) {
      return <h1 key={i} className="mt-10 mb-4 text-3xl font-black tracking-tight text-[#050505]">{linkify(line.slice(2))}</h1>;
    }
    if (line.startsWith("## ")) {
      return <h2 key={i} className="mt-9 mb-3 text-2xl font-black tracking-tight text-[#050505]">{linkify(line.slice(3))}</h2>;
    }
    if (line.startsWith("### ")) {
      return <h3 key={i} className="mt-7 mb-2 text-lg font-bold text-[#1c1e21]">{linkify(line.slice(4))}</h3>;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      return (
        <li key={i} className="ml-5 text-base leading-8 text-[#1c1e21]" style={{ listStyleType: "disc" }}>
          {linkify(line.slice(2))}
        </li>
      );
    }
    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={i} className="mt-5 text-base font-bold text-[#1c1e21]">{linkify(line.slice(2, -2))}</p>;
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return (
      <p key={i} className="text-base leading-8 text-[#1c1e21]">
        {linkify(line)}
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
    <main className="min-h-screen" style={{ background: "#F0F2F5", color: "#1C1E21" }}>
      <div className="border-b bg-white" style={{ borderColor: "#E4E6EB" }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/home" className="flex items-center gap-3 transition-opacity hover:opacity-85">
            <LogoMark />
            <span className="text-sm font-black text-[#1c1e21]">Hinilas Pro</span>
          </Link>
          <Link href="/blog" className="text-xs font-bold transition-colors hover:text-[#050505]" style={{ color: "#65676B" }}>
            All posts
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide" style={{ color: "#65676B" }}>
            {new Date(post.published_at).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "Asia/Manila",
            })}
          </p>
          <h1 className="mb-4 text-4xl font-black leading-tight tracking-tight text-[#050505]">
            {post.title}
          </h1>
          {post.meta_description && (
            <p className="text-lg leading-8" style={{ color: "#65676B" }}>
              {post.meta_description}
            </p>
          )}
        </div>

        {post.hero_image_url && (
          <div className="mb-10 overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "#E4E6EB" }}>
            <img
              src={post.hero_image_url}
              alt={post.title}
              className="w-full object-cover"
              style={{ aspectRatio: "1200/630" }}
            />
          </div>
        )}

        <article className="rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: "#E4E6EB" }}>
          <div className="flex flex-col gap-3">
            {renderArticle(post.article)}
          </div>
        </article>

        {post.cta && (
          <div
            className="mt-10 rounded-2xl p-8"
            style={{ background: "#1C1E21", color: "#FFFFFF" }}
          >
            <div
              className="mb-4 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
              style={{ background: "rgba(24,119,242,0.08)", color: "#0866FF", border: "1px solid rgba(24,119,242,0.2)" }}
            >
              Try Hinilas Pro
            </div>
            <p className="mb-2 text-xl font-black">Want a faster path from idea to campaign?</p>
            <p className="mb-6 text-sm leading-7" style={{ color: "#CBD5E1" }}>
              {post.cta.replace(/Try it (now )?at https?:\/\/[^\s]+/gi, "").trim()}
            </p>
            <a
              href="https://www.hinilas.pro/home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl px-6 py-3 text-sm font-black transition-all hover:brightness-105"
              style={{ background: "#D97706", color: "#111827" }}
            >
              Try Hinilas Pro free
            </a>
          </div>
        )}

        <div className="mt-10">
          <Link href="/blog" className="text-xs font-bold transition-colors hover:text-[#050505]" style={{ color: "#65676B" }}>
            Back to all posts
          </Link>
        </div>
      </div>
    </main>
  );
}
