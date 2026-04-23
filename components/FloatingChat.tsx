"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCommunityMessages } from "@/lib/use-community-messages";

function Avatar({ name, avatar }: { name: string; avatar?: string | null }) {
  if (avatar) return <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover shrink-0" />;
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "#2B7EC9" }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function FloatingChat() {
  const [supabase] = useState(createClient);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [glowing, setGlowing] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages } = useCommunityMessages();
  const lastCountRef = useRef<number>(
    typeof window !== "undefined" ? parseInt(localStorage.getItem("hilason_last_count") || "0") : 0
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.full_name || user.email || "User",
          avatar: user.user_metadata?.avatar_url || null,
        });
      }
      setAuthLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setCurrentUser(null);
      } else {
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email || "User",
          avatar: session.user.user_metadata?.avatar_url || null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (open) return;
    if (messages.length <= lastCountRef.current) return;

    setUnread((prev) => prev + (messages.length - lastCountRef.current));
    setGlowing(true);
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    lastCountRef.current = messages.length;
    localStorage.setItem("hilason_last_count", String(messages.length));
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [messages.length, open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

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

  function openChat() {
    setUnread(0);
    setGlowing(false);
    lastCountRef.current = messages.length;
    localStorage.setItem("hilason_last_count", String(messages.length));
    setOpen(true);
  }

  function closeChat() {
    setOpen(false);
  }

  if (!authLoaded || !currentUser) return null;

  return (
    <>
      {open && (
        <div
          className="fixed bottom-12 right-3 z-50 w-72 md:w-80 rounded-t-2xl rounded-bl-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden"
          style={{
            background: "#0F172A",
            height: "400px",
            animation: "slideUp 0.2s ease-out",
          }}
        >
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0" style={{ background: "#0A0F1A" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-sm font-bold">Mga Hilason</span>
              <span className="text-gray-600 text-xs">{messages.length} messages</span>
            </div>
            <button onClick={closeChat} className="text-gray-500 hover:text-white text-base">×</button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-gray-600 text-xs pt-8">No messages yet. Say something!</p>
            )}
            {messages.map((msg, idx) => {
              const isMe = msg.user_id === currentUser?.id;
              const sameUser = messages[idx - 1]?.user_id === msg.user_id;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                  {!sameUser ? <Avatar name={msg.user_name} avatar={msg.user_avatar} /> : <div className="w-7 shrink-0" />}
                  <div className={`max-w-[75%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {!sameUser && (
                      <div className={`flex items-baseline gap-1.5 mb-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-semibold text-gray-300">{isMe ? "You" : msg.user_name}</span>
                        <span className="text-gray-600 text-xs">{formatTime(msg.created_at)}</span>
                      </div>
                    )}
                    <div
                      className="px-3 py-2 text-xs leading-relaxed"
                      style={{
                        background: isMe ? "#2B7EC9" : "#1E293B",
                        color: isMe ? "#fff" : "#D1D5DB",
                        borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
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

          <div className="px-3 py-3 border-t border-gray-800 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message everyone..."
                rows={1}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-600 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                style={{ maxHeight: "80px" }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 shrink-0 transition-opacity hover:opacity-90"
                style={{ background: "#2B7EC9" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 right-3 z-50 flex flex-col items-center" style={{ width: "48px" }}>
        <button
          onClick={() => (open ? closeChat() : openChat())}
          className="relative flex flex-col items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "10px 10px 0 0",
            background: open ? "#1E293B" : "linear-gradient(135deg, #7C3AED, #2B7EC9)",
            boxShadow: glowing ? "0 0 0 3px #7C3AED50, 0 0 16px #7C3AED70" : "0 -2px 12px rgba(0,0,0,0.4)",
            animation: glowing && !open ? "pulse-glow 1.5s ease-in-out infinite" : "none",
          }}
        >
          <span className="text-lg leading-none">💬</span>
          <span className="text-white font-bold leading-none mt-0.5" style={{ fontSize: "8px", letterSpacing: "0.02em" }}>HILASON</span>
          {unread > 0 && !open && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center font-bold" style={{ background: "#EF4444", color: "#fff", fontSize: "9px" }}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 4px #7C3AED40, 0 0 20px #7C3AED60; }
          50% { box-shadow: 0 0 0 8px #7C3AED25, 0 0 32px #7C3AED80; }
        }
      `}</style>
    </>
  );
}
