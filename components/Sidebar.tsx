"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/context";

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

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-xs font-bold">H</div>
          <div>
            <p className="text-white font-bold text-sm tracking-wide">Hinilas Pro</p>
            <p className="text-gray-500 text-xs">Meta Ads AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Business context */}
      {setup && (
        <div className="px-4 py-3 mx-3 mt-3 rounded-lg bg-blue-950 border border-blue-800">
          <p className="text-blue-300 text-xs font-medium truncate">{setup.businessName}</p>
          <p className="text-blue-500 text-xs truncate">{setup.product}</p>
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base w-5 text-center">{mod.icon}</span>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${active ? "text-white" : ""}`}>{mod.label}</p>
                <p className={`text-xs truncate ${active ? "text-blue-200" : "text-gray-600 group-hover:text-gray-400"}`}>
                  {mod.description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-800">
        <p className="text-gray-600 text-xs">Powered by JBI / Hilas Framework</p>
        <p className="text-gray-700 text-xs">by Ken Allego</p>
      </div>
    </aside>
  );
}
