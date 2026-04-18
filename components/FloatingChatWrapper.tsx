"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import FloatingChat from "@/components/FloatingChat";

const EXCLUDED_PATHS = ["/home", "/testimonial", "/privacy", "/terms"];

export default function FloatingChatWrapper() {
  const pathname = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setLoggedIn(!!user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (EXCLUDED_PATHS.includes(pathname) || !loggedIn) return null;

  return <FloatingChat />;
}
