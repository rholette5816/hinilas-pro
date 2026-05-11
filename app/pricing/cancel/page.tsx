"use client";

import { useRouter } from "next/navigation";

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0F1A" }}>
      <div className="text-center max-w-sm px-6">
        <div className="text-5xl mb-6">↩</div>
        <h1 className="text-xl font-bold text-[#1c1e21] mb-3">Payment cancelled</h1>
        <p className="text-gray-400 text-sm mb-8">No charge was made. You can upgrade anytime when you&apos;re ready.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/pricing")}
            className="w-full text-white py-3 rounded-lg text-sm font-semibold"
            style={{ background: "#1877F2" }}
          >
            Back to Pricing
          </button>
          <button
            onClick={() => router.push("/creative")}
            className="text-gray-500 text-sm hover:text-gray-400"
          >
            Continue with free credits
          </button>
        </div>
      </div>
    </div>
  );
}
