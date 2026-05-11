"use client";

import { HinilasIcon } from "@/components/HinilasLogo";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Feedback {
  id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  message: string;
}

const BRAND_BLUE = "#1E3A8A";
const BRAND_ORANGE = "#D97706";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const INNER = "#F1F5F9";

const STEPS = [
  {
    num: "01",
    label: "Research",
    desc: "Understand your buyers, competitors, objections, and offer gaps before spending on ads.",
    color: BRAND_BLUE,
  },
  {
    num: "02",
    label: "Position",
    desc: "Turn raw research into sharp ad angles, hooks, and reasons people should buy now.",
    color: BRAND_ORANGE,
  },
  {
    num: "03",
    label: "Create",
    desc: "Generate ad copy and creative prompts that are ready for review, editing, and launch.",
    color: "#7C3AED",
  },
  {
    num: "04",
    label: "Launch",
    desc: "Follow a structured Meta Ads setup flow so campaigns go live with fewer blind spots.",
    color: "#10B981",
  },
];

const FEATURES = [
  { title: "Market Research", desc: "Buyer psychology, competitor gaps, and campaign direction in one guided flow." },
  { title: "Ad Angle Builder", desc: "Fresh positioning options tailored to your product, audience, and offer." },
  { title: "Copy Generator", desc: "Primary text, headlines, CTAs, and sales frameworks built for Meta Ads." },
  { title: "Creative Studio", desc: "Ad image prompts and visual variations connected to the angle you choose." },
  { title: "Campaign Guide", desc: "A practical launch checklist for Messenger, traffic, and conversion campaigns." },
  { title: "AI Assistant", desc: "Ask follow-up questions when you need a clearer hook, offer, or next move." },
];

const FAQS = [
  {
    q: "How does Hinilas Pro work?",
    a: "You enter your business profile once. Hinilas Pro uses it to guide market research, build ad angles, write copy, and prepare campaign assets in a structured workflow.",
  },
  {
    q: "Who is this for?",
    a: "It is built for Filipino sellers, business owners, and ad operators who need faster decisions and cleaner campaign assets without jumping between multiple tools.",
  },
  {
    q: "Is it a magic button?",
    a: "No. It gives you better research, clearer angles, and faster drafts. You still review the output, adjust it to your offer, and run the campaign responsibly.",
  },
];

const LOGIN_MESSAGES = [
  "Preparing your workspace...",
  "Loading market intelligence...",
  "Setting up your ad workflow...",
  "Almost ready...",
];

function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <HinilasIcon size="md" accentColor={BRAND_ORANGE} />
      <div className="leading-tight">
        <div className="flex items-baseline">
          <span className={`font-bold text-lg ${dark ? "text-white" : "text-slate-900"}`}>Hinilas</span>
          <span className="font-bold text-lg" style={{ color: BRAND_ORANGE }}>Pro</span>
        </div>
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: BRAND_BLUE }}>
          AI Driven. Results Focused.
        </p>
      </div>
    </div>
  );
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {FAQS.map((faq, i) => (
        <div
          key={faq.q}
          className="overflow-hidden rounded-xl border transition-colors"
          style={{ background: "#FFFFFF", borderColor: open === i ? BRAND_BLUE : BORDER }}
        >
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            type="button"
          >
            <span className="text-sm font-bold" style={{ color: TEXT }}>{faq.q}</span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ background: INNER, color: BRAND_BLUE }}>
              {open === i ? "-" : "+"}
            </span>
          </button>
          {open === i && (
            <div className="px-5 pb-5">
              <p className="text-sm leading-7" style={{ color: MUTED }}>{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOGIN_MESSAGES.length);
    }, 900);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(14px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-7"
        style={{
          background: "#FFFFFF",
          border: `1px solid ${BORDER}`,
          boxShadow: "0 24px 80px rgba(15,23,42,0.18)",
          animation: "modalIn 0.28s cubic-bezier(0.22,1,0.36,1) forwards",
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition-colors hover:bg-slate-200"
          style={{ background: INNER, color: MUTED }}
          type="button"
          aria-label="Close"
        >
          X
        </button>

        <div className="mb-7">
          <BrandMark />
        </div>

        <h2 className="mb-2 text-2xl font-black tracking-tight" style={{ color: TEXT }}>
          Start with 30 free credits
        </h2>
        <p className="mb-7 text-sm leading-6" style={{ color: MUTED }}>
          Create your business profile, run guided research, and generate your first Meta Ads assets in minutes.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-bold transition-all hover:brightness-105 disabled:opacity-70"
          style={{ background: BRAND_BLUE, color: "#FFFFFF" }}
        >
          {loading ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.1 0 5.8 1.1 8 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.6 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-16.9z" />
              <path fill="#FBBC05" d="M10.7 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6l-7-5.4A23.8 23.8 0 0 0 .5 24c0 3.9.9 7.5 2.7 10.7l7.5-6.1z" />
              <path fill="#34A853" d="M24 47c5.5 0 10.2-1.8 13.6-4.9l-7.4-5.7c-1.8 1.2-4.1 1.9-6.2 1.9-6.3 0-11.6-4.2-13.5-9.9l-7.5 6.1C7 42.3 14.8 47 24 47z" />
            </svg>
          )}
          <span>{loading ? LOGIN_MESSAGES[msgIndex] : "Continue with Google"}</span>
        </button>

        <div
          className="mt-3 flex w-full cursor-not-allowed items-center justify-center rounded-xl py-3.5 text-sm font-semibold opacity-60"
          style={{ background: INNER, border: `1px solid ${BORDER}`, color: MUTED }}
        >
          Facebook login coming soon
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold" style={{ color: MUTED }}>
          <span>SSL encrypted</span>
          <span>Free to start</span>
          <span>No spam</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((d) => setFeedbacks(d.feedbacks || []))
      .catch(() => setFeedbacks([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("meta_viewcontent_home_sent")) return;

    window.sessionStorage.setItem("meta_viewcontent_home_sent", "1");

    void fetch("/api/meta/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "ViewContent",
        eventId: `viewcontent-home-${Date.now()}`,
        eventSourceUrl: window.location.href,
        customData: {
          content_name: "Hinilas Pro Home",
          content_category: "Landing Page",
        },
      }),
    }).catch(() => {
      window.sessionStorage.removeItem("meta_viewcontent_home_sent");
    });
  }, []);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
    : "5.0";

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#F8FAFC", color: TEXT }}>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .hp-shell {
          background:
            linear-gradient(180deg, rgba(30,58,138,0.08) 0%, rgba(248,250,252,0) 45%),
            radial-gradient(circle at 82% 8%, rgba(217,119,6,0.14), transparent 28%);
        }
      `}</style>

      <div className="hp-shell">
        <nav className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-xl" style={{ borderColor: BORDER }}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
            <BrandMark />
            <div className="flex items-center gap-2">
              <Link
                href="/blog"
                className="hidden rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-slate-100 sm:inline-flex"
                style={{ color: MUTED }}
              >
                Blog
              </Link>
              <button
                onClick={openModal}
                className="rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-slate-100"
                style={{ color: MUTED }}
                type="button"
              >
                Sign in
              </button>
              <button
                onClick={openModal}
                className="rounded-xl px-4 py-2 text-sm font-bold transition-all hover:brightness-105"
                style={{ background: BRAND_BLUE, color: "#FFFFFF" }}
                type="button"
              >
                Start free
              </button>
            </div>
          </div>
        </nav>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:pb-24 lg:pt-20">
          <div className="min-w-0">
            <div
              className="mb-6 inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide"
              style={{ background: "#EAF4FF", border: "1px solid #BFDBFE", color: BRAND_BLUE }}
            >
              Meta Ads AI for Filipino sellers
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Build ads with strategy, not guesswork.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 sm:text-lg" style={{ color: MUTED }}>
              Hinilas Pro helps you research your market, find stronger angles, write better copy, and prepare campaign assets before you spend on Meta Ads.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={openModal}
                className="rounded-xl px-6 py-3.5 text-sm font-black transition-all hover:brightness-105"
                style={{ background: BRAND_ORANGE, color: "#111827", boxShadow: "0 14px 30px rgba(217,119,6,0.28)" }}
                type="button"
              >
                Start with 30 free credits
              </button>
              <button
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="rounded-xl border bg-white px-6 py-3.5 text-sm font-bold transition-colors hover:bg-slate-50"
                style={{ borderColor: BORDER, color: TEXT }}
                type="button"
              >
                See the workflow
              </button>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["30", "free credits"],
                ["4", "guided modules"],
                [avgRating, "average rating"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border bg-white p-4" style={{ borderColor: BORDER }}>
                  <p className="text-2xl font-black" style={{ color: BRAND_BLUE }}>{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide" style={{ color: MUTED }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="w-full max-w-full overflow-hidden rounded-2xl border bg-white shadow-2xl shadow-slate-200/70" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Campaign workspace</p>
                  <p className="text-sm font-black text-slate-900">Skin care offer analysis</p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "#ECFDF5", color: "#059669" }}>
                  Ready
                </span>
              </div>
              <div className="space-y-4 p-5">
                {["Research complete", "Winning angle selected", "Copy set generated"].map((item, i) => (
                  <div key={item} className="min-w-0 overflow-hidden rounded-xl border p-4 sm:flex sm:items-center sm:gap-3" style={{ background: i === 1 ? "#EFF6FF" : INNER, borderColor: i === 1 ? "#BFDBFE" : BORDER }}>
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black" style={{ background: i === 1 ? BRAND_BLUE : "#FFFFFF", color: i === 1 ? "#FFFFFF" : BRAND_BLUE }}>
                      {i + 1}
                    </div>
                    <div className="mt-3 min-w-0 sm:mt-0">
                      <p className="text-sm font-bold text-slate-900">{item}</p>
                      <p className="truncate text-xs" style={{ color: MUTED }}>Built from your business profile and target customer.</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border p-5" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                  <p className="mb-2 text-xs font-black uppercase tracking-wide" style={{ color: "#B45309" }}>Suggested angle</p>
                  <p className="text-sm leading-7 text-slate-800">
                    Sell the confidence of knowing what to say before the first peso is spent on ads.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section id="how-it-works" className="border-y bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_BLUE }}>The system</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">A clean workflow from research to launch.</h2>
            <p className="mt-4 text-base leading-7" style={{ color: MUTED }}>
              Every output builds on the previous step, so the campaign feels connected instead of randomly generated.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div key={step.label} className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color: step.color }}>{step.num}</span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: step.color }} />
                </div>
                <h3 className="mb-2 text-lg font-black text-slate-900">{step.label}</h3>
                <p className="text-sm leading-7" style={{ color: MUTED }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_ORANGE }}>Everything connected</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">One workspace for better ad decisions.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7" style={{ color: MUTED }}>
            The product is built to help you move faster without making the campaign feel careless.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
              <div className="mb-4 h-1.5 w-10 rounded-full" style={{ background: BRAND_BLUE }} />
              <h3 className="mb-2 text-base font-black text-slate-900">{f.title}</h3>
              <p className="text-sm leading-7" style={{ color: MUTED }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {feedbacks.length > 0 && (
        <section className="border-y bg-white" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: "#10B981" }}>User feedback</p>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">What users are saying</h2>
              <p className="mt-3 text-sm font-semibold" style={{ color: MUTED }}>{avgRating} out of 5 from {feedbacks.length} users</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {feedbacks.slice(0, 6).map((f) => (
                <div key={f.id} className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
                  <div className="mb-4 flex items-center gap-3">
                    {f.user_avatar ? (
                      <img src={f.user_avatar} alt={f.user_name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 rounded-full text-sm font-black text-white" style={{ background: BRAND_BLUE, placeItems: "center" }}>
                        {f.user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900">{f.user_name}</p>
                      <p className="text-xs font-semibold" style={{ color: BRAND_ORANGE }}>{f.rating}/5 rating</p>
                    </div>
                  </div>
                  <p className="text-sm leading-7" style={{ color: MUTED }}>
                    &quot;{f.message.length > 150 ? `${f.message.slice(0, 150)}...` : f.message}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_BLUE }}>FAQ</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">Common questions</h2>
          <p className="mt-4 text-base leading-7" style={{ color: MUTED }}>
            Straight answers before you create an account.
          </p>
        </div>
        <FAQSection />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10">
        <div className="rounded-2xl px-6 py-12 text-center sm:px-10" style={{ background: TEXT, color: "#FFFFFF" }}>
          <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_ORANGE }}>Start today</p>
          <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
            Build your first strategy-backed ad workflow for free.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7" style={{ color: "#CBD5E1" }}>
            Create a profile, generate research, choose an angle, and turn it into campaign-ready copy.
          </p>
          <button
            onClick={openModal}
            className="mt-8 rounded-xl px-7 py-3.5 text-sm font-black transition-all hover:brightness-105"
            style={{ background: BRAND_ORANGE, color: "#111827" }}
            type="button"
          >
            Start free
          </button>
        </div>
      </section>

      <footer className="border-t bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <BrandMark />
          <div className="flex items-center gap-5 text-xs font-semibold" style={{ color: MUTED }}>
            <a href="/privacy" className="transition-colors hover:text-slate-900">Privacy</a>
            <a href="/terms" className="transition-colors hover:text-slate-900">Terms</a>
            <span>2026 Hinilas Pro</span>
          </div>
        </div>
      </footer>

      {showModal && <LoginModal onClose={closeModal} />}
    </div>
  );
}
