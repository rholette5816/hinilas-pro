"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  message: string;
  created_at: string;
}

function Avatar({ name, avatar, size = 8 }: { name: string; avatar?: string | null; size?: number }) {
  if (avatar) return <img src={avatar} alt={name} className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />;
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0`}
      style={{ background: "#2B7EC9" }}
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

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
  }, []);

  async function fetchMessages() {
    const { data } = await supabase
      .from("community_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(data as Message[]);
  }

  useEffect(() => {
     
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col pt-14 md:pt-0 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 shrink-0" style={{ background: "#0B1120" }}>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-purple-950 border border-purple-800 rounded-full px-3 py-1">
              <span className="text-purple-300 text-xs font-medium">💬 Community</span>
            </div>
            <span className="text-gray-600 text-xs">{messages.length} messages</span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">Hinilas Community</h1>
          <p className="text-gray-500 text-xs">Share wins, ask questions, help each other grow.</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-600 text-sm">No messages yet. Be the first to say something!</p>
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
                      <span className="text-xs font-semibold text-white">{isMe ? "You" : msg.user_name}</span>
                      <span className="text-gray-600 text-xs">{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                  <div
                    className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: isMe ? "#2B7EC9" : "#0F172A",
                      color: isMe ? "#fff" : "#D1D5DB",
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

        {/* Input */}
        <div className="px-4 py-4 border-t border-gray-800 shrink-0" style={{ background: "#0B1120" }}>
          {currentUser ? (
            <div className="flex items-end gap-3 max-w-3xl mx-auto">
              <Avatar name={currentUser.name} avatar={currentUser.avatar} size={8} />
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a message... (Enter to send)"
                  rows={1}
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 pr-12 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ maxHeight: "120px" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="absolute right-3 bottom-3 w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity hover:opacity-90"
                  style={{ background: "#2B7EC9" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-600 text-sm">Log in to send messages.</p>
          )}
        </div>

      </main>
    </div>
  );
}
