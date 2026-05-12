"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCommunityMessages } from "@/lib/use-community-messages";

function Avatar({ name, avatar, size = 8 }: { name: string; avatar?: string | null; size?: number }) {
  if (avatar) return <img src={avatar} alt={name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0`}
      style={{ background: "#1877F2" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function CommunityPage() {
  const [supabase] = useState(createClient);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages } = useCommunityMessages();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.full_name || user.email || "User",
          avatar: user.user_metadata?.avatar_url || null,
        });
      }
    });
  }, [supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !currentUser || sending) return;
    setSending(true);
    const msg = input.trim();
    setInput("");
    await supabase.from("community_messages").insert({
      user_id: currentUser.id,
      user_name: currentUser.name,
      user_avatar: currentUser.avatar,
      message: msg,
    });
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <main className="flex-1 flex flex-col pt-14 md:pt-0 overflow-hidden">
        <div className="px-6 py-4 shrink-0" style={{ background: "#FFFFFF", borderBottom: "1px solid #E4E6EB" }}>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ background: "#f2f3f5", border: "1px solid #E4E6EB" }}>
              <span className="text-xs font-medium" style={{ color: "#65676B" }}>💬 Community</span>
            </div>
            <span className="text-[#8a8d91] text-xs">{messages.length} messages</span>
          </div>
          <h1 className="text-xl font-bold text-[#1c1e21] mt-1">Hinilas Community</h1>
          <p className="text-[#8a8d91] text-xs">Share wins, ask questions, help each other grow.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#8a8d91] text-sm">No messages yet. Be the first to say something!</p>
            </div>
          )}
          {messages.map((msg, idx) => {
            const isMe = msg.user_id === currentUser?.id;
            const prevMsg = messages[idx - 1];
            const sameUser = prevMsg?.user_id === msg.user_id;

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                {!sameUser ? (
                  <Avatar name={msg.user_name} avatar={msg.user_avatar} size={8} />
                ) : (
                  <div className="w-8 shrink-0" />
                )}
                <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  {!sameUser && (
                    <div className={`flex items-baseline gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                      <span className="text-xs font-semibold text-[#1c1e21]">{isMe ? "You" : msg.user_name}</span>
                      <span className="text-[#8a8d91] text-xs">{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: isMe ? "#1877F2" : "#f2f3f5",
                      color: isMe ? "#fff" : "#1C1E21",
                      border: isMe ? "1px solid #1877F2" : "1px solid #E4E6EB",
                      borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    }}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 py-4 shrink-0" style={{ background: "#FFFFFF", borderTop: "1px solid #E4E6EB" }}>
          {currentUser ? (
            <div className="flex items-end gap-3 max-w-3xl mx-auto">
              <Avatar name={currentUser.name} avatar={currentUser.avatar} size={8} />
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a message... (Enter to send)"
                  rows={1}
                  className="w-full rounded-2xl px-4 py-3 pr-12 text-[#1c1e21] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ background: "#FFFFFF", border: "1px solid #E4E6EB", maxHeight: "120px" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="absolute right-3 bottom-3 w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity hover:opacity-90"
                  style={{ background: "#1877F2" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-[#8a8d91] text-sm">Log in to send messages.</p>
          )}
        </div>
      </main>
  );
}
