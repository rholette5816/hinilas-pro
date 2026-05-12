"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ReactNode } from "react";

const PUBLIC_ROUTES = ["/home", "/pricing", "/blog", "/privacy", "/terms", "/data-deletion"];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    pathname.startsWith("/ref/");

  if (isPublic) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
