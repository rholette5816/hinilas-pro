"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CommunityMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  message: string;
  created_at: string;
}

const MESSAGE_LIMIT = 100;
const RECOVERY_REFRESH_MS = 60000;

function sortMessages(messages: CommunityMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function mergeMessages(
  existing: CommunityMessage[],
  incoming: CommunityMessage[]
): CommunityMessage[] {
  const merged = new Map<string, CommunityMessage>();

  for (const message of existing) {
    merged.set(message.id, message);
  }

  for (const message of incoming) {
    merged.set(message.id, message);
  }

  return sortMessages(Array.from(merged.values())).slice(-MESSAGE_LIMIT);
}

export function useCommunityMessages() {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    let active = true;

    async function loadMessages() {
      const { data } = await supabase
        .from("community_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(MESSAGE_LIMIT);

      if (!active || !data) return;
      setMessages(data as CommunityMessage[]);
      setLoading(false);
    }

    void loadMessages();

    const channel = supabase
      .channel(`community_messages:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
        },
        (payload) => {
          if (!active) return;
          setMessages((prev) =>
            mergeMessages(prev, [payload.new as CommunityMessage])
          );
          setLoading(false);
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          void loadMessages();
        }
      });

    const refreshTimer = window.setInterval(() => {
      void loadMessages();
    }, RECOVERY_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, []);

  return { messages, loading };
}
