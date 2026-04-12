"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useApp, derivePlan } from "@/lib/context";
import HinilasLogo from "@/components/HinilasLogo";
import FloatingExpert from "@/components/FloatingExpert";
import FloatingFeedback from "@/components/FloatingFeedback";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

function LiveStats() {
  const [online, setOnline] = useState(47);
  const [total, setTotal] = useState(1243);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnline(prev => prev + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 3));
      setTotal(prev => Math.random() > 0.85 ? prev + 1 : prev);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2 mx-3 mt-3 rounded-lg" style={{ background: "#0A0F1A" }}>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400 text-xs font-medium">{online} online</span>
      </div>
      <span className="text-gray-700 text-xs">·</span>
      <span className="text-gray-500 text-xs">{total.toLocaleString()} users</span>
    </div>
  );
}

const modules: { href: string; label: string; icon: string; description: string; highlight?: boolean }[] = [
  { href: "/", label: "Setup", icon: "⚙", description: "Your business profile" },
  { href: "/research", label: "Research", icon: "🔍", description: "Know your customer" },
  { href: "/angles", label: "Angles", icon: "🎯", description: "Find winning angles" },
  { href: "/creative", label: "Creative", icon: "🖼", description: "Generate ad images" },
  { href: "/copy", label: "Sales Copy", icon: "✍", description: "Write your captions" },
  { href: "/analyze", label: "Analyze", icon: "📊", description: "Read your results" },
  { href: "/learn", label: "Courses", icon: "📖", description: "Marketing & ads education" },
  { href: "/community", label: "Mga Hilason", icon: "💬", description: "Chat with other users" },
  { href: "/pricing", label: "Pricing", icon: "⚡", description: "Credits & plans" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setup, credits, creditsTotal, plan } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; avatar: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          name: user.user_metadata?.full_name || user.email || "User",
          avatar: user.user_metadata?.avatar_url || "",
        });
      }
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <HinilasLogo size="md" showTagline={false} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setExpertOpen(true); setMobileOpen(false); }}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#F5A623", color: "#000" }}
          >
            <span className="text-xs">🎙</span>
            <span>Expert</span>
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-gray-500 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Live stats */}
      <LiveStats />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {modules.map((mod) => {
          const active = pathname === mod.href;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                active ? "text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
              style={
                active
                  ? { background: "#2B7EC9" }
                  : mod.highlight && !active
                  ? { background: "#1C1200", border: "1px solid #92400E" }
                  : {}
              }
            >
              <span className="text-base w-5 text-center">{mod.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${active ? "text-white" : mod.highlight ? "text-amber-400" : ""}`}>{mod.label}</p>
                <p className={`text-xs truncate ${active ? "text-blue-100" : mod.highlight ? "text-amber-700" : "text-gray-600 group-hover:text-gray-400"}`}>
                  {mod.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        {/* Credits display */}
        <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block mb-3">
          <div className="rounded-lg px-3 py-2 border border-gray-700 hover:border-gray-600 transition-colors" style={{ background: "#0F172A" }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: plan === "max" ? "#1A0000" : plan === "flex" ? "#1C1200" : "#1A1A1A",
                    color: plan === "max" ? "#EF4444" : plan === "flex" ? "#F5A623" : "#9CA3AF",
                    border: `1px solid ${plan === "max" ? "#EF444450" : plan === "flex" ? "#F5A62350" : "#374151"}`,
                  }}
                >
                  {plan === "max" ? "MAX" : plan === "flex" ? "FLEX" : "LITE"}
                </span>
                <span className="text-xs text-gray-500">
                  {plan === "lite" ? "0–49 cr" : plan === "flex" ? "50–299 cr" : "300+ cr"}
                </span>
              </div>
              <span className="text-xs font-semibold" style={{
                color: credits === 0 ? "#EF4444" : plan === "max" ? "#EF4444" : plan === "flex" ? "#F5A623" : "#9CA3AF"
              }}>
                {credits} credits
              </span>
            </div>
            {/* Threshold bar */}
            <div className="relative w-full bg-gray-800 rounded-full h-1.5">
              {/* Flex threshold marker at 50/300 */}
              <div className="absolute top-0 bottom-0 w-px bg-gray-600" style={{ left: `${(50/300)*100}%` }} />
              <div
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min((credits / 300) * 100, 100)}%`,
                  background: plan === "max" ? "#EF4444" : plan === "flex" ? "#F5A623" : "#9CA3AF",
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-700 text-xs">0</span>
              <span className="text-gray-700 text-xs">50</span>
              <span className="text-gray-700 text-xs">300</span>
            </div>
          </div>
        </Link>

        {user && (
          <div className="flex items-center gap-3 mb-3">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "#2B7EC9" }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user.name}</p>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Log out
              </button>
            </div>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="shrink-0 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 px-2 py-1 rounded-md transition-colors"
            >
              💬
            </button>
          </div>
        )}
        <p className="text-gray-700 text-xs">By Basta Mag Ads Hilas</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-gray-800 px-4 py-3 flex items-center justify-between" style={{ background: "#0F172A" }}>
        <HinilasLogo size="sm" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpertOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#F5A623", color: "#000" }}
          >
            <span>🎙</span>
            <span>Book Expert</span>
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Open menu"
          >
            <div className="space-y-1.5">
              <span className="block w-6 h-0.5 bg-current" />
              <span className="block w-6 h-0.5 bg-current" />
              <span className="block w-6 h-0.5 bg-current" />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 border-r border-gray-800 transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "#0F172A" }}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-gray-800 flex-col h-full shrink-0" style={{ background: "#0F172A" }}>
        <SidebarContent />
      </aside>

      {/* Expert booking modal */}
      <FloatingExpert isOpen={expertOpen} onClose={() => setExpertOpen(false)} />

      {/* Feedback modal */}
      <FloatingFeedback isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
