"use client";

import Sidebar from "@/components/Sidebar";

export default function CampaignSetupPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-5xl mb-4">🚀</div>
          <h1 className="text-2xl font-bold text-white mb-2">Campaign Setup</h1>
          <p className="text-gray-400 text-sm">Coming soon. Build and structure your Meta Ads campaign here.</p>
        </div>
      </main>
    </div>
  );
}
