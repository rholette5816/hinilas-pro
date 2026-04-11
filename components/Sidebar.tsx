"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/context";
import HinilasLogo, { HinilasIcon } from "@/components/HinilasLogo";

const modules = [
  { href: "/", label: "Setup", icon: "⚙", description: "Your business profile" },
  { href: "/learn", label: "Learn", icon: "📖", description: "Marketing & ads education" },
  { href: "/research", label: "Research", icon: "🔍", description: "Know your customer" },
  { href: "/angles", label: "Angles", icon: "🎯", description: "Find winning angles" },
  { href: "/copy", label: "Copy", icon: "✍", description: "Write your ad copy" },
  { href: "/creative", label: "Creative", icon: "🖼", description: "Generate ad images" },
  { href: "/analyze", label: "Analyze", icon: "📊", description: "Read your results" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { setup } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <HinilasLogo size="md" showTagline={false} />
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-gray-500 hover:text-white p-1"
        >
          ✕
        </button>
      </div>

      {/* Business context */}
      {setup && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-lg border" style={{ background: "#0F172A", borderColor: "#2B7EC930" }}>
          <p className="text-xs font-medium truncate" style={{ color: "#2B7EC9" }}>{setup.businessName}</p>
          <p className="text-xs truncate text-gray-500">{setup.product}</p>
        </div>
      )}

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
              style={active ? { background: "#2B7EC9" } : {}}
            >
              <span className="text-base w-5 text-center">{mod.icon}</span>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${active ? "text-white" : ""}`}>{mod.label}</p>
                <p className={`text-xs truncate ${active ? "text-blue-100" : "text-gray-600 group-hover:text-gray-400"}`}>
                  {mod.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs">I&apos;m your Digital Marketing Assistant</p>
        <p className="text-gray-700 text-xs mt-0.5">By Basta Mag Ads Hilas</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 border-b border-gray-800 px-4 py-3 flex items-center justify-between" style={{ background: "#0F172A" }}>
        <HinilasLogo size="sm" />
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
    </>
  );
}
