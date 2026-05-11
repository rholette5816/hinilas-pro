"use client";

import { HinilasIcon } from "@/components/HinilasLogo";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

interface Feedback {
  id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  message: string;
}

const BRAND_BLUE = "#1877F2";
const BRAND_ORANGE = "#D97706";
const TEXT = "#1C1E21";
const MUTED = "#64748B";
const BORDER = "#E4E6EB";
const INNER = "#f2f3f5";

const STEPS = [
  { num: "01", label: "Research", desc: "Understand your buyers, competitors, objections, and offer gaps before spending on ads.", color: BRAND_BLUE },
  { num: "02", label: "Position", desc: "Turn raw research into sharp ad angles, hooks, and reasons people should buy now.", color: BRAND_ORANGE },
  { num: "03", label: "Create", desc: "Generate ad copy and creative prompts that are ready for review, editing, and launch.", color: "#7C3AED" },
  { num: "04", label: "Launch", desc: "Follow a structured Meta Ads setup flow so campaigns go live with fewer blind spots.", color: "#10B981" },
];

const FEATURES = [
  { num: "01", title: "Market Research", desc: "Buyer psychology, competitor gaps, and campaign direction in one guided flow." },
  { num: "02", title: "Ad Angle Builder", desc: "Fresh positioning options tailored to your product, audience, and offer." },
  { num: "03", title: "Copy Generator", desc: "Primary text, headlines, CTAs, and sales frameworks built for Meta Ads." },
  { num: "04", title: "Creative Studio", desc: "Ad image prompts and visual variations connected to the angle you choose." },
  { num: "05", title: "Campaign Guide", desc: "A practical launch checklist for Messenger, traffic, and conversion campaigns." },
  { num: "06", title: "AI Assistant", desc: "Ask follow-up questions when you need a clearer hook, offer, or next move." },
];

const UGC_VIDEOS = [
  { src: "/videos/restaurant-owner.mp4", name: "Local Restaurant Owner", handle: "@restolord_ph", caption: "Kinaya ng AI ang ads namin 🔥 Solid results gamit Hinilas Pro!", likes: "14.2K", shares: "3.8K", comments: "912" },
  { src: "/videos/realestate-broker.mp4", name: "Real Estate Broker", handle: "@kenbroker_realty", caption: "Grabe ang lead quality pagkatapos gamitin ito. Hindi pa ako nag-hire ng copywriter 💯", likes: "21.5K", shares: "6.1K", comments: "1.4K" },
  { src: "/videos/hardware-owner.mp4", name: "Local Hardware Owner", handle: "@hardwaremarcelo", caption: "Sa loob ng 10 minuto may ad na ako. Walang agency needed 🛠️", likes: "9.7K", shares: "2.3K", comments: "541" },
  { src: "/videos/spa-wellness-owner.mp4", name: "Spa & Wellness Owner", handle: "@serenityspa_davao", caption: "Ang gaan gamitin kahit hindi ako tech-savvy. Booking namin nag-double! ✨", likes: "18.3K", shares: "5.2K", comments: "1.1K" },
];

const FAQS = [
  { q: "How does Hinilas Pro work?", a: "You enter your business profile once. Hinilas Pro uses it to guide market research, build ad angles, write copy, and prepare campaign assets in a structured workflow." },
  { q: "Who is this for?", a: "It is built for Filipino sellers, business owners, and ad operators who need faster decisions and cleaner campaign assets without jumping between multiple tools." },
  { q: "Is it a magic button?", a: "No. It gives you better research, clearer angles, and faster drafts. You still review the output, adjust it to your offer, and run the campaign responsibly." },
  { q: "How much does it cost?", a: "You start with 30 free credits. Paid plans start at ₱499/month. You can also top up with ₱249 credit packs anytime." },
  { q: "Do I need to be techy?", a: "No. Hinilas Pro is built for non-techy business owners. If you can fill out a form and click a button, you can use every feature." },
];

const LOGIN_MESSAGES = [
  "Preparing your workspace...",
  "Loading market intelligence...",
  "Setting up your ad workflow...",
  "Almost ready...",
];

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <HinilasIcon size="md" accentColor={BRAND_ORANGE} />
      <div className="leading-tight">
        <div className="flex items-baseline">
          <span className="font-bold text-lg text-[#1c1e21]">Hinilas</span>
          <span className="font-bold text-lg" style={{ color: BRAND_ORANGE }}>Pro</span>
        </div>
      </div>
    </div>
  );
}

function ReelCard({ src, name, handle, caption, likes, shares, comments }: { src: string; name: string; handle: string; caption: string; likes: string; shares: string; comments: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.play().catch(() => {}); }
      else { el.pause(); }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div className="ugc-card">
      <div className="relative rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "9/16" }}>
        <video ref={videoRef} src={src} loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ transform: "scale(1.08)", transformOrigin: "center center" }} />
        {/* gradient overlay bottom */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.0) 50%)" }} />
        {/* right side actions */}
        <div className="absolute right-3 bottom-20 flex flex-col gap-5">
          <div className="reel-action-btn">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span className="reel-action-label">{likes}</span>
          </div>
          <div className="reel-action-btn">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="reel-action-label">{comments}</span>
          </div>
          <div className="reel-action-btn">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span className="reel-action-label">{shares}</span>
          </div>
        </div>
        {/* bottom caption */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
          <p className="text-white text-xs font-black mb-0.5" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.7)" }}>{name}</p>
          <p className="text-white/80 text-[11px] leading-snug" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{handle}</p>
          <p className="text-white text-xs mt-1 leading-snug line-clamp-2" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{caption}</p>
        </div>
      </div>
    </div>
  );
}

function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {FAQS.map((faq, i) => (
        <div key={faq.q} className="overflow-hidden rounded-xl border transition-colors" style={{ background: "#FFFFFF", borderColor: open === i ? BRAND_BLUE : BORDER }}>
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" type="button">
            <span className="text-base font-bold" style={{ color: TEXT }}>{faq.q}</span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ background: INNER, color: BRAND_BLUE }}>{open === i ? "−" : "+"}</span>
          </button>
          {open === i && (
            <div className="px-5 pb-5">
              <p className="text-sm leading-7 text-[#1c1e21]">{faq.a}</p>
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
    const interval = setInterval(() => setMsgIndex((prev) => (prev + 1) % LOGIN_MESSAGES.length), 900);
    return () => clearInterval(interval);
  }, [loading]);

  async function handleGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback` } });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(14px)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative w-full max-w-sm rounded-2xl p-7" style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, boxShadow: "0 24px 80px rgba(15,23,42,0.18)", animation: "modalIn 0.28s cubic-bezier(0.22,1,0.36,1) forwards" }}>
        <button onClick={onClose} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition-colors hover:bg-slate-200" style={{ background: INNER, color: MUTED }} type="button">✕</button>
        <div className="mb-7"><BrandMark /></div>
        <h2 className="mb-2 text-2xl font-black tracking-tight" style={{ color: TEXT }}>Start with 30 free credits</h2>
        <p className="mb-7 text-sm leading-6" style={{ color: MUTED }}>Create your business profile, run guided research, and generate your first Meta Ads assets in minutes.</p>
        <button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-bold transition-all hover:brightness-105 disabled:opacity-70" style={{ background: BRAND_BLUE, color: "#FFFFFF" }}>
          {loading ? (
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.1 0 5.8 1.1 8 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-16.9z" /><path fill="#FBBC05" d="M10.7 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6l-7-5.4A23.8 23.8 0 0 0 .5 24c0 3.9.9 7.5 2.7 10.7l7.5-6.1z" /><path fill="#34A853" d="M24 47c5.5 0 10.2-1.8 13.6-4.9l-7.4-5.7c-1.8 1.2-4.1 1.9-6.2 1.9-6.3 0-11.6-4.2-13.5-9.9l-7.5 6.1C7 42.3 14.8 47 24 47z" /></svg>
          )}
          <span>{loading ? LOGIN_MESSAGES[msgIndex] : "Continue with Google"}</span>
        </button>
        <div className="mt-3 flex w-full cursor-not-allowed items-center justify-center rounded-xl py-3.5 text-sm font-semibold opacity-60" style={{ background: INNER, border: `1px solid ${BORDER}`, color: MUTED }}>Facebook login coming soon</div>
        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm font-semibold" style={{ color: MUTED }}>
          <span>SSL encrypted</span><span>Free to start</span><span>No spam</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/feedback").then((r) => r.json()).then((d) => setFeedbacks(d.feedbacks || [])).catch(() => setFeedbacks([]));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("meta_viewcontent_home_sent")) return;
    window.sessionStorage.setItem("meta_viewcontent_home_sent", "1");
    void fetch("/api/meta/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventName: "ViewContent", eventId: `viewcontent-home-${Date.now()}`, eventSourceUrl: window.location.href, customData: { content_name: "Hinilas Pro Home", content_category: "Landing Page" } }) }).catch(() => { window.sessionStorage.removeItem("meta_viewcontent_home_sent"); });
  }, []);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : "5.0";

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#F0F2F5", color: TEXT }}>
      <style>{`
        @keyframes modalIn { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .ugc-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
        .ugc-scroll::-webkit-scrollbar { display: none; }
        .ugc-card { flex: 0 0 220px; scroll-snap-align: start; }
        @media (min-width: 1024px) { .ugc-scroll { display: grid; grid-template-columns: repeat(4, 1fr); overflow-x: visible; gap: 16px; } .ugc-card { flex: none; } }
        .reel-action-btn { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: default; }
        .reel-action-btn svg { filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5)); }
        .reel-action-label { font-size: 11px; font-weight: 700; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
        .testimonial-scroll { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 12px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; }
        .testimonial-scroll::-webkit-scrollbar { display: none; }
        .testimonial-card { flex: 0 0 300px; scroll-snap-align: start; }
        @media (min-width: 768px) { .testimonial-card { flex: 0 0 340px; } }
      `}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-xl" style={{ borderColor: BORDER }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Link href="/blog" className="hidden rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-[#f2f3f5] sm:inline-flex" style={{ color: MUTED }}>Blog</Link>
            <a href="#pricing" className="hidden rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-[#f2f3f5] sm:inline-flex" style={{ color: MUTED }}>Pricing</a>
            <button onClick={openModal} className="rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-[#f2f3f5]" style={{ color: MUTED }} type="button">Sign in</button>
            <button onClick={openModal} className="rounded-xl px-4 py-2.5 text-sm font-black transition-all hover:brightness-105" style={{ background: BRAND_ORANGE, color: "#111827" }} type="button">
              Try Hinilas Pro →
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-12 pt-10 lg:gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:pb-24 lg:pt-20">
        <div className="min-w-0">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide" style={{ background: "#e7f3ff", border: "1px solid #BFDBFE", color: BRAND_BLUE }}>
            AI Ad Execution System for Filipino Business Owners
          </div>
          <h1 className="max-w-xl text-3xl font-black leading-[1.05] tracking-tight text-[#050505] sm:text-5xl lg:text-6xl">
            Stop guessing.<br />Start launching.
          </h1>
          <p className="mt-3 max-w-lg text-base leading-7 text-[#1c1e21]">
            Research your market, find winning angles, write ad copy, and set up campaigns — all in one guided workflow built for non-techy Filipino business owners.
          </p>

          {/* Social proof */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["K","M","J","A","R"].map((l, i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-black text-white" style={{ background: [BRAND_BLUE,"#7C3AED","#10B981",BRAND_ORANGE,"#EF4444"][i] }}>{l}</div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                {"★★★★★".split("").map((s, i) => <span key={i} className="text-sm" style={{ color: BRAND_ORANGE }}>{s}</span>)}
                <span className="ml-1 text-sm font-bold text-[#1c1e21]">{avgRating}</span>
              </div>
              <p className="text-xs text-[#1c1e21] font-semibold">Trusted by Filipino business owners</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={openModal} className="rounded-xl px-7 py-4 text-base font-black transition-all hover:brightness-105" style={{ background: BRAND_ORANGE, color: "#111827", boxShadow: "0 14px 30px rgba(217,119,6,0.28)" }} type="button">
              Create My Free Ad Kit →
            </button>
            <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl border bg-white px-6 py-4 text-sm font-bold transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }} type="button">
              See how it works
            </button>
          </div>
          <p className="mt-3 text-xs text-[#1c1e21]">30 free credits · No credit card required · Cancel anytime</p>
        </div>

        {/* Product mock */}
        <div className="relative min-w-0">
          <div className="w-full overflow-hidden rounded-2xl border bg-white shadow-2xl shadow-slate-200/70" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: BORDER }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: MUTED }}>Campaign workspace</p>
                <p className="text-sm font-black text-[#1c1e21]">Skincare offer — Free Delivery</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "#ECFDF5", color: "#059669" }}>Ready</span>
            </div>
            <div className="space-y-3 p-5">
              {["Research complete", "Winning angle selected", "Copy set generated"].map((item, i) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border p-4" style={{ background: i === 1 ? "#EFF6FF" : INNER, borderColor: i === 1 ? "#c3d9fd" : BORDER }}>
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black" style={{ background: i === 1 ? BRAND_BLUE : "#FFFFFF", color: i === 1 ? "#FFFFFF" : BRAND_BLUE }}>{i + 1}</div>
                  <div>
                    <p className="text-sm font-bold text-[#1c1e21]">{item}</p>
                    <p className="text-xs text-[#1c1e21]">Built from your business profile</p>
                  </div>
                </div>
              ))}
              <div className="rounded-xl border p-4" style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
                <p className="mb-1 text-xs font-black uppercase tracking-wide" style={{ color: "#B45309" }}>Suggested angle</p>
                <p className="text-sm leading-6 text-[#1c1e21]">"Sell the confidence of knowing what to say before the first peso is spent."</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY STRIP */}
      <section className="border-y bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl px-5 py-10">
          <p className="mb-6 text-center text-xs font-black uppercase tracking-widest" style={{ color: MUTED }}>Trusted by Filipino business owners across these industries</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { val: "1,000+", label: "Business owners" },
              { val: "5,000+", label: "Ad kits generated" },
              { val: "₱499", label: "Starting/month" },
              { val: "30", label: "Free credits to start" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-black" style={{ color: BRAND_BLUE }}>{s.val}</p>
                <p className="mt-1 text-sm font-semibold text-[#1c1e21]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-12 lg:py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_BLUE }}>The system</p>
          <h2 className="text-3xl font-black tracking-tight text-[#050505] sm:text-4xl">A week of prep. In one session.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#1c1e21]">Every output builds on the previous step so your campaign feels connected instead of randomly generated.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.label} className="rounded-xl border bg-white p-6" style={{ borderColor: BORDER }}>
              <div className="mb-5 flex items-center justify-between">
                <span className="text-2xl font-black" style={{ color: step.color }}>{step.num}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: step.color }} />
              </div>
              <h3 className="mb-2 text-lg font-black text-[#1c1e21]">{step.label}</h3>
              <p className="text-sm leading-7 text-[#1c1e21]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-y bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl px-4 py-12 lg:py-20">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_ORANGE }}>Everything in one place</p>
            <h2 className="text-3xl font-black tracking-tight text-[#050505] sm:text-4xl">8-in-1 Ad Execution System</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#1c1e21]">No more jumping between tools. Research, angles, copy, creatives, and campaign setup — all inside one workflow.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-white p-6" style={{ borderColor: BORDER }}>
                <span className="mb-4 inline-block text-xs font-black uppercase tracking-widest" style={{ color: BRAND_BLUE }}>{f.num}</span>
                <h3 className="mb-2 text-base font-black text-[#1c1e21]">{f.title}</h3>
                <p className="text-sm leading-7 text-[#1c1e21]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* UGC REELS SECTION */}
      <section className="mx-auto max-w-6xl px-4 py-12 lg:py-20">
        <div className="mb-10 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: "#7C3AED" }}>Real results</p>
          <h2 className="text-3xl font-black tracking-tight text-[#050505] sm:text-4xl">See What Our Users Are Making</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#1c1e21]">Real ads. Real business owners. Real results from the Hinilas Pro workflow.</p>
        </div>
        <div className="ugc-scroll">
          {UGC_VIDEOS.map((u, i) => (
            <ReelCard key={i} {...u} />
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      {feedbacks.length > 0 && (
        <section className="border-y bg-white" style={{ borderColor: BORDER }}>
          <div className="mx-auto max-w-6xl px-5 py-20">
            <div className="mb-10 text-center">
              <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: "#10B981" }}>What they say</p>
              <h2 className="text-3xl font-black tracking-tight text-[#050505]">Users who stopped guessing</h2>
              <div className="mt-3 flex items-center justify-center gap-2">
                {"★★★★★".split("").map((s, i) => <span key={i} style={{ color: BRAND_ORANGE }}>{s}</span>)}
                <span className="text-sm font-bold text-[#1c1e21]">{avgRating} from {feedbacks.length} users</span>
              </div>
            </div>
            <div className="testimonial-scroll">
              {feedbacks.map((f) => (
                <div key={f.id} className="testimonial-card rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
                  <div className="mb-4 flex items-center gap-3">
                    {f.user_avatar ? (
                      <img src={f.user_avatar} alt={f.user_name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-10 w-10 rounded-full text-sm font-black text-white" style={{ background: BRAND_BLUE, placeItems: "center" }}>{f.user_name.charAt(0).toUpperCase()}</div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-[#1c1e21]">{f.user_name}</p>
                      <div className="flex items-center gap-1">
                        {"★★★★★".split("").slice(0, f.rating).map((s, i) => <span key={i} className="text-xs" style={{ color: BRAND_ORANGE }}>{s}</span>)}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-[#1c1e21]">"{f.message.length > 160 ? `${f.message.slice(0, 160)}...` : f.message}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* KEN'S CREDIBILITY */}
      <section className="mx-auto max-w-6xl px-4 py-12 lg:py-20">
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: BORDER }}>
          <div className="grid lg:grid-cols-[380px_1fr]">
            {/* Photo */}
            <div className="relative min-h-[340px] lg:min-h-0" style={{ background: INNER }}>
              <Image src="/ken.jpg" alt="Kevin Allego — Hinilas Pro founder" fill className="object-cover object-top" />
            </div>
            {/* Copy */}
            <div className="p-6 lg:p-12">
              <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_BLUE }}>Built by a practitioner</p>
              <h2 className="text-2xl font-black text-[#050505] sm:text-3xl">Kevin Rholette T. Allego RN</h2>
              <p className="mt-1 text-base font-semibold" style={{ color: BRAND_ORANGE }}>Meta Ads Strategist, eCommerce Operator, Founder</p>
              <div className="mt-6 space-y-4 text-base leading-8 text-[#1c1e21]">
                <p>I built Hinilas Pro because I kept seeing the same problem — business owners spending money on ads without a real system. They guessed the angle. They copied captions. They boosted posts and hoped.</p>
                <p>I wanted a tool that forces the right thinking before the first peso is spent. Research first. Angle next. Copy follows. Campaign last. That is the system.</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                {["Meta Ads Strategist", "Multi-Brand eCommerce Operator", "KRA Digitals AI Automation Founder"].map((badge) => (
                  <span key={badge} className="rounded-full px-4 py-1.5 text-xs font-bold" style={{ background: "#e7f3ff", color: BRAND_BLUE, border: "1px solid #BFDBFE" }}>{badge}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING TEASE */}
      <section id="pricing" className="border-y bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl px-4 py-12 text-center lg:py-16">
          <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_BLUE }}>Simple pricing</p>
          <h2 className="text-3xl font-black tracking-tight text-[#050505] sm:text-4xl">₱499/mo. No guesswork fees.</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#1c1e21]">Start free with 30 credits. Upgrade when you are ready. Top up anytime with ₱249 credit packs. Less than the cost of one wrong boosted post.</p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button onClick={openModal} className="rounded-xl px-7 py-4 text-base font-black transition-all hover:brightness-105" style={{ background: BRAND_ORANGE, color: "#111827", boxShadow: "0 14px 30px rgba(217,119,6,0.28)" }} type="button">
              Start free — 30 credits →
            </button>
            <a href="/pricing" className="rounded-xl border bg-white px-6 py-4 text-sm font-bold transition-colors hover:bg-slate-50" style={{ borderColor: BORDER, color: TEXT }}>
              See full pricing
            </a>
          </div>
          <p className="mt-4 text-xs text-[#1c1e21]">FREE · CANCEL ANYTIME · NO CREDIT CARD REQUIRED</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12 lg:py-20 text-center">
        <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_BLUE }}>FAQ</p>
        <h2 className="text-3xl font-black tracking-tight text-[#050505]">Common questions</h2>
        <p className="mt-4 mb-8 text-base leading-7 text-[#1c1e21]">Straight answers before you create an account.</p>
        <FAQSection />
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-8 lg:pb-10">
        <div className="rounded-2xl px-6 py-12 text-center sm:px-12 sm:py-16" style={{ background: "linear-gradient(135deg, #1877F2 0%, #0d5dbf 100%)", color: "#FFFFFF" }}>
          <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: BRAND_ORANGE }}>Start today</p>
          <h2 className="mx-auto max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">Build your first ad kit in the next 10 minutes.</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7" style={{ color: "#CBD5E1" }}>No agency, no workshop, no guessing. Just your business details and a system that tells you exactly what to say.</p>
          <button onClick={openModal} className="mt-8 rounded-xl px-8 py-4 text-base font-black transition-all hover:brightness-105" style={{ background: BRAND_ORANGE, color: "#111827" }} type="button">
            Create My Free Ad Kit →
          </button>
          <p className="mt-4 text-xs" style={{ color: "#8a8d91" }}>30 free credits · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <BrandMark />
          <div className="flex items-center gap-5 text-sm font-semibold" style={{ color: MUTED }}>
            <a href="/privacy" className="transition-colors hover:text-[#1c1e21]">Privacy</a>
            <a href="/terms" className="transition-colors hover:text-[#1c1e21]">Terms</a>
            <a href="/blog" className="transition-colors hover:text-[#1c1e21]">Blog</a>
            <span>© 2026 Hinilas Pro</span>
          </div>
        </div>
      </footer>

      {showModal && <LoginModal onClose={closeModal} />}
    </div>
  );
}
