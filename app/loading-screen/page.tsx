"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HinilasIcon } from "@/components/HinilasLogo";
import { createClient } from "@/lib/supabase/client";

const MESSAGES = [
  "Cooking your workspace...",
  "Firing up the AI engine...",
  "Syncing your business profile...",
  "Preparing your ad arsenal...",
  "Loading market intelligence...",
  "Setting up your campaign tools...",
  "Almost ready, Sir...",
];

export default function LoadingScreen() {
  const router = useRouter();
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % MESSAGES.length);
    }, 1200);

    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 400);

    // Redirect based on payment status
    const redirect = setTimeout(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/home"); return; }
      const { data } = await supabase
        .from("user_data")
        .select("credits_remaining, locked_tier")
        .eq("user_id", user.id)
        .single();
      const hasPaid = data?.locked_tier === "Flex" || data?.locked_tier === "Max";
      const hasCredits = (data?.credits_remaining ?? 0) > 0;
      if (!hasPaid && !hasCredits) {
        router.replace("/pricing");
      } else {
        router.replace("/");
      }
    }, 3500);

    return () => {
      clearInterval(msgInterval);
      clearInterval(dotsInterval);
      clearTimeout(redirect);
    };
  }, [router]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: "#F0F2F5" }}
    >
      {/* Glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(24,119,242,0.12) 0%, transparent 70%)" }}
      />

      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <HinilasIcon size="lg" accentColor="#D97706" />
        <div className="leading-tight">
          <div className="flex items-baseline">
            <span className="text-[#1c1e21] font-bold text-2xl">Hinilas</span>
            <span className="font-bold text-2xl" style={{ color: "#D97706" }}>Pro</span>
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#1877F2" }}>
            AI Driven. Results Focused.
          </p>
        </div>
      </div>

      {/* Spinner */}
      <div className="relative w-14 h-14 mb-8">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "2px solid rgba(24,119,242,0.15)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: "2px solid transparent",
            borderTopColor: "#1877F2",
            borderRightColor: "#D97706",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full" style={{ background: "#D97706" }} />
        </div>
      </div>

      {/* Rotating message */}
      <p
        key={msgIndex}
        className="text-sm font-medium mb-3"
        style={{
          color: "#1C1E21",
          animation: "fadeUp 0.4s ease forwards",
        }}
      >
        {MESSAGES[msgIndex]}
      </p>

      {/* Animated dots bar */}
      <div className="flex gap-1.5 mt-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#1877F2",
              animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
