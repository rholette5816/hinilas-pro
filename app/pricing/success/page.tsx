"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/context";

const PLAN_LABELS: Record<string, string> = {
  pro: "Hinilas Pro",
  max: "Hinilas Max",
  topup: "50 Credit Top-up",
};

function SuccessContent() {
  const { refreshCredits } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") || "pro";

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0F1A" }}>
      <div className="text-center max-w-sm px-6">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-3">Payment Successful!</h1>
        <p className="text-gray-400 text-sm mb-2">
          Your <span className="text-white font-semibold">{PLAN_LABELS[plan] || plan}</span> is now active.
        </p>
        <p className="text-gray-500 text-xs mb-8">Credits have been added to your account.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/creative")}
            className="w-full text-white py-3 rounded-lg text-sm font-semibold"
            style={{ background: "#D97706" }}
          >
            Start Generating →
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 text-sm hover:text-gray-400"
          >
            Go to Setup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
