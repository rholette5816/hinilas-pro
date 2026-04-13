"use client";

import { createClient } from "@/lib/supabase/client";
import { HinilasIcon } from "@/components/HinilasLogo";
import { useEffect, useState } from "react";

interface Feedback {
  id: string;
  user_name: string;
  rating: number;
  message: string;
}

export default function LoginPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  useEffect(() => {
    fetch("/api/feedback")
      .then(r => r.json())
      .then(d => setFeedbacks(d.feedbacks || []));
  }, []);

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "#0B1120" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <HinilasIcon size="lg" accentColor="#F5A623" />
            <div className="leading-tight">
              <div className="flex items-baseline">
                <span className="text-white font-bold text-xl tracking-wide">Hinilas</span>
                <span className="font-bold text-xl tracking-wide" style={{ color: "#F5A623" }}>Pro</span>
              </div>
              <p className="text-[10px] font-semibold tracking-widest uppercase leading-none mt-0.5">
                <span style={{ color: "#2B7EC9" }}>AI Driven. </span>
                <span style={{ color: "#F5A623" }}>Results Focused.</span>
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-8 mb-6"
          style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
        >
          <h2 className="text-white text-xl font-semibold mb-1">Welcome to Hinilas Pro</h2>
          <p className="text-sm mb-8" style={{ color: "#94A3B8" }}>
            Sign in with your Google account to continue.
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: "#1E2D45", border: "1px solid #2B3D55", color: "#E2E8F0" }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.1 0 5.8 1.1 8 2.9l6-6C34.5 3.1 29.6 1 24 1 14.8 1 7 6.7 3.7 14.6l7 5.4C12.4 13.6 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7c4.3-4 6.8-9.9 6.8-16.9z"/>
              <path fill="#FBBC05" d="M10.7 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.7-4.6l-7-5.4A23.8 23.8 0 0 0 .5 24c0 3.9.9 7.5 2.7 10.7l7.5-6.1z"/>
              <path fill="#34A853" d="M24 47c5.5 0 10.2-1.8 13.6-4.9l-7.4-5.7c-1.8 1.2-4.1 1.9-6.2 1.9-6.3 0-11.6-4.2-13.5-9.9l-7.5 6.1C7 42.3 14.8 47 24 47z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Social proof */}
        {feedbacks.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-center text-gray-600 uppercase tracking-widest">What users say</p>
            {feedbacks.slice(0, 4).map(f => (
              <div key={f.id} className="rounded-xl px-4 py-3" style={{ background: "#0F172A", border: "1px solid #1E2D45" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-xs font-semibold">{f.user_name}</span>
                  <span className="text-amber-400 text-xs">{"★".repeat(f.rating)}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">"{f.message}"</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs mt-6" style={{ color: "#475569" }}>
          By Basta Mag Ads Hilas
        </p>
      </div>
    </div>
  );
}
