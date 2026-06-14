"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AIOutput from "@/components/AIOutput";
import { ChatMessage, useApp } from "@/lib/context";
import { buildUserContext } from "@/lib/user-context";
import { MODULE_PROMPTS } from "@/lib/knowledge";

type PendingIntent = {
  intent: string;
  cost: number;
  message: string;
  images: string[];
  sessionId: string;
  title?: string;
};

type AdvancedResponse = {
  intent: string;
  cost: number;
  content?: string;
  renderButton?: boolean;
  requiresConfirm?: boolean;
  error?: string;
  code?: string;
};

type ChatProject = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

type ConversationSession = {
  id: string;
  title: string;
  pinned: boolean;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationSidebarProps = {
  refreshKey: number;
  onSessionChange: () => void;
};

const PAID_CARDS = ["research", "angles", "copy", "analyze_basic", "analyze_advanced"];

const LOADING_PHRASES: Record<string, string[]> = {
  research: ["Pulling market insights...", "Mapping your target audience...", "Analyzing buyer behavior...", "Reading the market..."],
  angles: ["Finding your strongest hook...", "Building the strategy...", "Crafting your ad angles...", "Thinking through the angles..."],
  copy: ["Writing your caption...", "Crafting the hook...", "Building your copy...", "Putting the words together..."],
  analyze_basic: ["Reading your ad data...", "Checking your metrics...", "Reviewing the numbers..."],
  analyze_advanced: ["Auditing your campaign...", "Going deep on the data...", "Breaking down the results..."],
  creative: ["Generating the visual...", "Building your ad creative...", "Designing the layout..."],
  default: ["Working on it...", "Let me think about this...", "On it..."],
};

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function actionLabel(intent: string) {
  const labels: Record<string, string> = {
    research: "Market research",
    angles: "Generate angles",
    copy: "Write ad copy",
    analyze_basic: "Basic analysis",
    analyze_advanced: "Advanced audit",
    creative: "Creative generation",
  };
  return labels[intent] || "Generate output";
}

function autoTitleFromMessage(message: string) {
  const title = message.replace(/\s+/g, " ").trim();
  if (!title) return "New Chat";
  return title.length > 45 ? `${title.slice(0, 45)}...` : title;
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return "";

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;

  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function cardForResponse(data: AdvancedResponse): ChatMessage["card"] {
  if (data.renderButton || data.intent === "creative") return "creative";
  if (PAID_CARDS.includes(data.intent)) return data.intent as ChatMessage["card"];
  return "text";
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.+?)\*/g, "$1")        // *italic*
    .replace(/_{1,2}(.+?)_{1,2}/g, "$1") // _italic_ or __bold__
    .replace(/`(.+?)`/g, "$1")          // `code`
    .replace(/^#{1,6}\s+/gm, "")        // # headings
    .replace(/^[-*]\s+/gm, "")          // bullet points
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // [links](url)
    .replace(/\s*---+\s*/g, "\n");      // horizontal rules
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function downloadReport(content: string, intent: string) {
  const html2pdf = (await import("html2pdf.js")).default;
  const wrapper = document.createElement("div");
  wrapper.style.padding = "32px";
  wrapper.style.fontFamily = "Inter, Arial, sans-serif";
  wrapper.style.color = "#111827";
  wrapper.style.background = "#FFFFFF";
  wrapper.innerHTML = `
    <div style="border-bottom:3px solid #1877F2;padding-bottom:18px;margin-bottom:24px">
      <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#D97706;font-weight:800;margin:0 0 6px">Hinilas Pro</p>
      <h1 style="font-size:28px;line-height:1.1;margin:0;color:#0F172A">Meta Ads Analysis Report</h1>
      <p style="font-size:12px;color:#64748B;margin:8px 0 0">${escapeHtml(intent.replace(/_/g, " "))}</p>
    </div>
    <div style="font-size:13px;line-height:1.6;white-space:pre-wrap">${escapeHtml(content)}</div>
  `;

  await html2pdf()
    .set({
      filename: `hinilas-${intent.replace(/_/g, "-")}-report.pdf`,
      margin: 0.35,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    })
    .from(wrapper)
    .save();
}

function PinIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 17v5" />
      <path d="M5 17h14" />
      <path d="M8 3h8l-1 8 4 4v2H5v-2l4-4L8 3z" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 120ms ease" }}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ConversationSidebar({ refreshKey, onSessionChange }: ConversationSidebarProps) {
  const { activeSessionId, setActiveSessionId, setChatMessages } = useApp();
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [projects, setProjects] = useState<ChatProject[]>([]);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renamingProjectName, setRenamingProjectName] = useState("");
  const [projectPickerSessionId, setProjectPickerSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    if (!res.ok) {
      setSessions([]);
      return [];
    }

    const data = await res.json();
    const nextSessions = Array.isArray(data)
      ? data.map((session: Partial<ConversationSession>) => ({
        id: session.id || "",
        title: session.title || "New Chat",
        pinned: session.pinned === true,
        project_id: typeof session.project_id === "string" ? session.project_id : null,
        created_at: session.created_at || "",
        updated_at: session.updated_at || "",
      })).filter((session: ConversationSession) => session.id)
      : [];
    setSessions(nextSessions);
    return nextSessions;
  }, []);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/chat/projects");
    if (!res.ok) {
      setProjects([]);
      return [];
    }

    const data = await res.json();
    const nextProjects = Array.isArray(data) ? data as ChatProject[] : [];
    setProjects(nextProjects);
    return nextProjects;
  }, []);

  const createSession = useCallback(async () => {
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Chat" }),
    });
    if (!res.ok) return null;
    return await res.json() as ConversationSession;
  }, []);

  const ensureFallbackSession = useCallback(async (nextSessions: ConversationSession[]) => {
    const fallback = nextSessions[0];
    if (fallback) {
      await setActiveSessionId(fallback.id);
      return;
    }

    const created = await createSession();
    if (!created) return;
    await setActiveSessionId(created.id);
    await setChatMessages(created.id, []);
    await fetchSessions();
  }, [createSession, fetchSessions, setActiveSessionId, setChatMessages]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions, refreshKey]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function initializeSessions() {
      const nextSessions = await fetchSessions();
      if (activeSessionId) return;
      await ensureFallbackSession(nextSessions);
    }

    void initializeSessions();
  }, [activeSessionId, ensureFallbackSession, fetchSessions]);

  async function handleNewChat() {
    setLoading(true);
    onSessionChange();
    try {
      const created = await createSession();
      if (!created) return;
      await setActiveSessionId(created.id);
      await setChatMessages(created.id, []);
      await fetchSessions();
    } finally {
      setLoading(false);
    }
  }

  function toggleProject(projectId: string) {
    setExpandedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) {
      setCreatingProject(false);
      setNewProjectName("");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/chat/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const project = await res.json() as ChatProject;
        setExpandedProjectIds(prev => {
          const next = new Set(prev);
          next.add(project.id);
          return next;
        });
        await fetchProjects();
      }
    } finally {
      setCreatingProject(false);
      setNewProjectName("");
      setLoading(false);
    }
  }

  async function handleRenameProject(projectId: string) {
    const name = renamingProjectName.trim();
    setRenamingProjectId(null);
    setRenamingProjectName("");
    if (!name) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/chat/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) await fetchProjects();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) return;
      await fetchProjects();
      await fetchSessions();
    } finally {
      setLoading(false);
    }
  }

  async function handleTogglePin(session: ConversationSession) {
    setProjectPickerSessionId(null);
    const nextPinned = !session.pinned;
    setSessions(prev => prev.map(item => item.id === session.id ? { ...item, pinned: nextPinned } : item));
    const res = await fetch(`/api/chat/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: nextPinned }),
    });
    if (!res.ok) await fetchSessions();
  }

  async function handleMoveSession(sessionId: string, projectId: string | null) {
    setProjectPickerSessionId(null);
    setSessions(prev => prev.map(item => item.id === sessionId ? { ...item, project_id: projectId } : item));
    const res = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    if (!res.ok) await fetchSessions();
  }

  async function handleSelect(sessionId: string) {
    if (sessionId === activeSessionId) return;
    setProjectPickerSessionId(null);
    onSessionChange();
    await setActiveSessionId(sessionId);
  }

  async function handleDelete(sessionId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) return;
      const nextSessions = (await fetchSessions()).filter(session => session.id !== sessionId);
      if (sessionId === activeSessionId) {
        onSessionChange();
        await ensureFallbackSession(nextSessions);
      }
    } finally {
      setLoading(false);
    }
  }

  const pinnedSessions = sessions.filter(session => session.pinned);
  const recentSessions = sessions.filter(session => !session.pinned && !session.project_id);
  const hasPinnedOrProjects = pinnedSessions.length > 0 || projects.length > 0;

  function projectSessions(projectId: string) {
    return sessions.filter(session => !session.pinned && session.project_id === projectId);
  }

  function renderSectionLabel(label: string, action?: ReactNode) {
    return (
      <div className="mt-3 mb-1 flex items-center justify-between px-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "#94A3B8" }}>{label}</p>
        {action}
      </div>
    );
  }

  function renderSessionItem(session: ConversationSession, indent = false) {
    const isActive = session.id === activeSessionId;
    return (
      <div
        key={session.id}
        className="group relative mb-1 rounded-r-lg border-l-[3px]"
        style={{
          marginLeft: indent ? 20 : 8,
          marginRight: 8,
          background: isActive ? "rgba(217,119,6,0.08)" : "transparent",
          borderLeftColor: isActive ? "#D97706" : "transparent",
        }}
      >
        <button
          type="button"
          onClick={() => handleSelect(session.id)}
          className="w-full px-3 py-2 pr-24 text-left"
        >
          <span className="block truncate text-sm font-bold" style={{ color: "#0F172A" }}>
            {session.title || "New Chat"}
          </span>
          <span className="block truncate text-xs" style={{ color: "#64748B" }}>
            {formatRelativeDate(session.updated_at)}
          </span>
        </button>
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              void handleTogglePin(session);
            }}
            className="h-6 w-6 rounded-full flex items-center justify-center"
            style={{ color: session.pinned ? "#D97706" : "#64748B", background: "rgba(0,0,0,0.05)" }}
            aria-label={session.pinned ? "Unpin chat" : "Pin chat"}
            title={session.pinned ? "Unpin chat" : "Pin chat"}
          >
            <PinIcon filled={session.pinned} />
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              setProjectPickerSessionId(projectPickerSessionId === session.id ? null : session.id);
            }}
            className="h-6 w-6 rounded-full flex items-center justify-center"
            style={{ color: "#64748B", background: "rgba(0,0,0,0.05)" }}
            aria-label="Move to project"
            title="Move to project"
          >
            <FolderIcon />
          </button>
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              void handleDelete(session.id);
            }}
            className="h-6 w-6 rounded-full text-sm font-bold"
            style={{ color: "#64748B", background: "rgba(0,0,0,0.05)" }}
            aria-label="Delete chat"
            title="Delete chat"
          >
            &times;
          </button>
        </div>

        {projectPickerSessionId === session.id ? (
          <div
            className="absolute right-2 top-9 z-20 w-44 rounded-lg p-1 shadow-lg"
            style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)" }}
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleMoveSession(session.id, null)}
              className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold"
              style={{ color: "#334155" }}
            >
              No folder
            </button>
            {projects.map(project => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleMoveSession(session.id, project.id)}
                className="w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold flex items-center gap-2"
                style={{ color: "#334155" }}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: project.color }} />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <aside
      className="hidden md:flex w-60 shrink-0 flex-col"
      style={{ background: "#F9F9F8", borderRight: "1px solid rgba(0,0,0,0.08)" }}
    >
      {/* Sidebar header */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider leading-none" style={{ color: "#D97706" }}>Hilas AI</p>
            <p className="text-xs font-medium leading-none mt-0.5" style={{ color: "#64748B" }}>Advanced Mode</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          disabled={loading}
          className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {pinnedSessions.length > 0 ? (
          <>
            {renderSectionLabel("Pinned")}
            {pinnedSessions.map(session => renderSessionItem(session))}
          </>
        ) : null}

        {renderSectionLabel(
          "Projects",
          <button
            type="button"
            onClick={() => {
              setCreatingProject(true);
              setNewProjectName("");
            }}
            className="h-5 w-5 rounded-full text-sm font-black leading-none"
            style={{ color: "#64748B", background: "rgba(0,0,0,0.05)" }}
            aria-label="Create project"
            title="Create project"
          >
            +
          </button>
        )}

        {creatingProject ? (
          <form
            className="mx-2 mb-1"
            onSubmit={event => {
              event.preventDefault();
              void handleCreateProject();
            }}
          >
            <input
              autoFocus
              value={newProjectName}
              onChange={event => setNewProjectName(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Escape") {
                  setCreatingProject(false);
                  setNewProjectName("");
                }
              }}
              placeholder="Project name"
              className="w-full rounded-lg px-3 py-2 text-sm font-semibold outline-none"
              style={{ color: "#0F172A", background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)" }}
            />
          </form>
        ) : null}

        {projects.map(project => {
          const isOpen = expandedProjectIds.has(project.id);
          const children = projectSessions(project.id);

          if (renamingProjectId === project.id) {
            return (
              <form
                key={project.id}
                className="mx-2 mb-1"
                onSubmit={event => {
                  event.preventDefault();
                  void handleRenameProject(project.id);
                }}
              >
                <input
                  autoFocus
                  value={renamingProjectName}
                  onChange={event => setRenamingProjectName(event.target.value)}
                  onBlur={() => void handleRenameProject(project.id)}
                  onKeyDown={event => {
                    if (event.key === "Escape") {
                      setRenamingProjectId(null);
                      setRenamingProjectName("");
                    }
                  }}
                  className="w-full rounded-lg px-3 py-2 text-sm font-semibold outline-none"
                  style={{ color: "#0F172A", background: "#ffffff", border: "1px solid rgba(0,0,0,0.08)" }}
                />
              </form>
            );
          }

          return (
            <div key={project.id} className="mb-1">
              <div className="group relative mx-2 rounded-lg">
                <button
                  type="button"
                  onClick={() => toggleProject(project.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 pr-16 text-left rounded-lg"
                  style={{ color: "#334155" }}
                >
                  <ChevronIcon open={isOpen} />
                  <span className="shrink-0" style={{ color: project.color }}><FolderIcon /></span>
                  <span className="truncate text-sm font-bold">{project.name}</span>
                </button>
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      setRenamingProjectId(project.id);
                      setRenamingProjectName(project.name);
                    }}
                    className="h-6 w-6 rounded-full flex items-center justify-center"
                    style={{ color: "#64748B", background: "rgba(0,0,0,0.05)" }}
                    aria-label="Rename project"
                    title="Rename project"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      void handleDeleteProject(project.id);
                    }}
                    className="h-6 w-6 rounded-full text-sm font-bold"
                    style={{ color: "#64748B", background: "rgba(0,0,0,0.05)" }}
                    aria-label="Delete project"
                    title="Delete project"
                  >
                    &times;
                  </button>
                </div>
              </div>
              {isOpen ? (
                <div>
                  {children.length > 0 ? children.map(session => renderSessionItem(session, true)) : (
                    <p className="px-8 py-1 text-xs" style={{ color: "#94A3B8" }}>No chats</p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}

        {recentSessions.length > 0 ? (
          <>
            {hasPinnedOrProjects ? renderSectionLabel("Recent") : null}
            {recentSessions.map(session => renderSessionItem(session))}
          </>
        ) : null}

        {!loading && sessions.length === 0 ? (
          <p className="px-4 py-3 text-xs" style={{ color: "#64748B" }}>No chats yet</p>
        ) : null}
      </div>
    </aside>
  );
}

export default function AdvancedChatPage() {
  const router = useRouter();
  const {
    setup,
    credits,
    refreshCredits,
    activeSessionId,
    chatMessages,
    setChatMessages,
    setCreativeImage,
    saveAdImages,
  } = useApp();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES.default[0]);
  const [streamingText, setStreamingText] = useState("");
  const [streamingIntent, setStreamingIntent] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntent | null>(null);
  const [notice, setNotice] = useState("");
  const [creativeLoadingId, setCreativeLoadingId] = useState<string | null>(null);
  const [sessionsRefreshKey, setSessionsRefreshKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasSetup = !!setup?.businessName;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, loading, streamingText]);

  useEffect(() => {
    if (!loading) {
      setLoadingPhrase(LOADING_PHRASES.default[0]);
      return;
    }

    const phrases = LOADING_PHRASES[streamingIntent] || LOADING_PHRASES.default;
    let phraseIndex = 0;
    setLoadingPhrase(phrases[phraseIndex]);
    const interval = window.setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setLoadingPhrase(phrases[phraseIndex]);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [loading, streamingIntent]);

  useEffect(() => {
    setPendingIntent(null);
  }, [activeSessionId]);

  function refreshSessionsList() {
    setSessionsRefreshKey(key => key + 1);
  }

  async function saveChatMessages(sessionId: string, messages: ChatMessage[], title?: string) {
    await setChatMessages(sessionId, messages, title);
    refreshSessionsList();
  }

  async function appendAssistantText(text: string, messagesSoFar: ChatMessage[] = chatMessages, sessionId: string | null = activeSessionId) {
    if (!sessionId) return;

    const assistantMsg: ChatMessage = {
      id: newId(),
      role: "assistant",
      text: cleanMarkdown(text),
      card: "text",
      intent: "knowledge",
      createdAt: new Date().toISOString(),
    };
    await saveChatMessages(sessionId, [...messagesSoFar, assistantMsg]);
  }

  async function handleAssistantResponse(data: AdvancedResponse, messagesSoFar: ChatMessage[], sessionId: string, title?: string) {
    const assistantMsg: ChatMessage = {
      id: newId(),
      role: "assistant",
      text: data.content || "",
      intent: data.intent,
      card: cardForResponse(data),
      cost: data.cost,
      renderButton: data.renderButton,
      createdAt: new Date().toISOString(),
    };

    const updated = [...messagesSoFar, assistantMsg];
    await saveChatMessages(sessionId, updated, title);

    if (data.intent === "select_angle" && data.content) {
      setNotice("Angle saved for copy and creative.");
    }
    if (data.cost > 0 && data.intent !== "creative") {
      await refreshCredits();
    }
  }

  async function streamGeneration(
    intent: string,
    cost: number,
    message: string,
    images: string[],
    sessionId: string,
    messagesSoFar: ChatMessage[],
    title?: string
  ) {
    setLoading(true);
    setStreamingIntent(intent);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, images, confirmed: true, intent, stream: true }),
      });

      const contentType = res.headers.get("Content-Type") || "";

      if (!res.ok) {
        const data = contentType.includes("application/json")
          ? await res.json().catch(() => ({} as AdvancedResponse))
          : {} as AdvancedResponse;
        await refreshCredits();
        await appendAssistantText(
          data.code === "NO_CREDITS" ? "Not enough credits. Please top up to continue." : data.error || "Something went wrong. Please try again.",
          messagesSoFar,
          sessionId
        );
        return;
      }

      if (contentType.includes("application/json")) {
        const data = await res.json() as AdvancedResponse;
        await handleAssistantResponse(data, messagesSoFar, sessionId, title);
        return;
      }

      if (!res.body) {
        await refreshCredits();
        await appendAssistantText("Something went wrong. Please try again.", messagesSoFar, sessionId);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamingText(cleanMarkdown(fullText));
      }

      fullText = cleanMarkdown(fullText + decoder.decode());

      const streamedIntent = res.headers.get("X-Intent") || intent;
      const streamedCost = Number(res.headers.get("X-Cost") || cost);
      const finalMsg: ChatMessage = {
        id: newId(),
        role: "assistant",
        text: fullText,
        card: PAID_CARDS.includes(streamedIntent) ? streamedIntent as ChatMessage["card"] : "text",
        intent: streamedIntent,
        cost: streamedCost > 0 ? streamedCost : undefined,
        createdAt: new Date().toISOString(),
      };

      const updatedMessages = [...messagesSoFar, finalMsg];
      const newTitle = title || (messagesSoFar.length === 0 ? autoTitleFromMessage(message) : undefined);
      await saveChatMessages(sessionId, updatedMessages, newTitle);
      await refreshCredits();
    } catch {
      await refreshCredits();
      await appendAssistantText("Something went wrong. Please try again.", messagesSoFar, sessionId);
    } finally {
      setStreamingText("");
      setStreamingIntent("");
      setLoading(false);
    }
  }

  async function handleSend(overrideText?: string) {
    const sessionId = activeSessionId;
    const messageText = (overrideText ?? input).trim();
    const image = attachedImage;
    if (!messageText && !image) return;
    if (!hasSetup) {
      router.push("/");
      return;
    }
    if (!sessionId) {
      setNotice("Starting a new chat. Please try again in a moment.");
      return;
    }

    setNotice("");
    const title = chatMessages.length === 0 ? autoTitleFromMessage(messageText) : undefined;
    const userMsg: ChatMessage = {
      id: newId(),
      role: "user",
      text: messageText,
      images: image ? [image] : [],
      createdAt: new Date().toISOString(),
    };
    const newMessages = [...chatMessages, userMsg];
    await saveChatMessages(sessionId, newMessages);
    setInput("");
    setAttachedImage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText || "Analyze this screenshot.",
          images: image ? [image] : [],
        }),
      });
      const data = await res.json() as AdvancedResponse;

      if (!res.ok) {
        await appendAssistantText(data.error || "Something went wrong. Please try again.", newMessages, sessionId);
        return;
      }

      if (data.requiresConfirm) {
        setPendingIntent({ intent: data.intent, cost: data.cost, message: messageText, images: image ? [image] : [], sessionId, title });
        const confirmMsg: ChatMessage = {
          id: newId(),
          role: "assistant",
          text: "",
          intent: data.intent,
          card: "confirm",
          cost: data.cost,
          createdAt: new Date().toISOString(),
        };
        await saveChatMessages(sessionId, [...newMessages, confirmMsg], title);
        return;
      }

      await streamGeneration(data.intent || "knowledge", data.cost || 0, messageText || "Analyze this screenshot.", image ? [image] : [], sessionId, newMessages, title);
    } catch {
      await appendAssistantText("Something went wrong. Please try again.", newMessages, sessionId);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!pendingIntent || !hasSetup) return;
    const sessionId = pendingIntent.sessionId;
    if (activeSessionId !== sessionId) {
      setPendingIntent(null);
      return;
    }

    const messagesWithoutConfirm = chatMessages.filter(msg => msg.card !== "confirm");
    if (credits < pendingIntent.cost) {
      setPendingIntent(null);
      await appendAssistantText("Not enough credits. Please top up to continue.", messagesWithoutConfirm, sessionId);
      return;
    }

    setLoading(true);
    setNotice("");
    await saveChatMessages(sessionId, messagesWithoutConfirm);

    const intent = pendingIntent.intent;
    const cost = pendingIntent.cost;
    const message = pendingIntent.message || "Continue";
    const images = pendingIntent.images;
    const title = pendingIntent.title;
    setPendingIntent(null);
    await streamGeneration(intent, cost, message, images, sessionId, messagesWithoutConfirm, title);
  }

  async function handleCancel() {
    if (!activeSessionId) return;
    setPendingIntent(null);
    await saveChatMessages(activeSessionId, chatMessages.filter(msg => msg.card !== "confirm"));
  }

  function handleImageAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function generateCreative(messageId: string, sourceText: string) {
    if (!setup || creativeLoadingId || !activeSessionId) return;
    if (credits < 2) {
      setNotice("Not enough credits. Please top up to generate a creative.");
      return;
    }

    setCreativeLoadingId(messageId);
    setNotice("");
    try {
      const angle = sourceText || "General product promotion";
      const prompt = MODULE_PROMPTS.creative(
        buildUserContext(setup, setup.language),
        angle,
        "",
        "",
        "",
        "1:1",
        setup.industry
      );
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio: "1:1", angle }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setNotice(data.code === "NO_CREDITS" ? "Not enough credits. Please top up to continue." : data.error || "Creative generation failed.");
        await refreshCredits();
        return;
      }

      const image = data.images?.[0] as string | undefined;
      if (!image) {
        setNotice("No image was generated. Please try again.");
        return;
      }

      setCreativeImage(image);
      await saveAdImages(image, null, null);
      await refreshCredits();
      const updated = chatMessages.map(msg => msg.id === messageId
        ? { ...msg, text: "Creative generated.", images: [image], renderButton: false }
        : msg
      );
      await saveChatMessages(activeSessionId, updated);
    } catch {
      setNotice("Creative generation failed. Please try again.");
    } finally {
      setCreativeLoadingId(null);
    }
  }

  function renderActions(msg: ChatMessage) {
    if (msg.card === "research") {
      return (
        <button
          onClick={() => navigator.clipboard.writeText(msg.text)}
          className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(255,255,255,0.08)", color: "#CBD5E1", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Copy research
        </button>
      );
    }

    if (msg.card === "angles") {
      return (
        <button
          onClick={() => navigator.clipboard.writeText(msg.text)}
          className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(255,255,255,0.08)", color: "#CBD5E1", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Copy angles
        </button>
      );
    }

    if (msg.card === "copy") {
      return (
        <button
          onClick={() => navigator.clipboard.writeText(msg.text)}
          className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(255,255,255,0.08)", color: "#CBD5E1", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          Copy caption
        </button>
      );
    }

    if (msg.card === "analyze_basic" || msg.card === "analyze_advanced" || msg.card === "analyze") {
      return (
        <button
          onClick={() => downloadReport(msg.text, msg.intent || "analysis")}
          className="px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: "rgba(217,119,6,0.15)", color: "#FBBF24", border: "1px solid rgba(217,119,6,0.35)" }}
        >
          Get Report
        </button>
      );
    }

    if (msg.card === "creative") {
      return (
        <button
          onClick={() => generateCreative(msg.id, msg.text)}
          disabled={creativeLoadingId === msg.id}
          className="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
          style={{ background: "#D97706", color: "#000" }}
        >
          {creativeLoadingId === msg.id ? "Generating..." : "Generate creative - 2 credits"}
        </button>
      );
    }

    return null;
  }

  function renderAssistantMessage(msg: ChatMessage) {
    if (msg.card === "confirm") {
      const cost = msg.cost || 0;
      return (
        <div className="rounded-xl p-4 my-2 max-w-xl" style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.3)" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "#0F172A" }}>{actionLabel(msg.intent || "")} - {cost} credit{cost > 1 ? "s" : ""}</p>
          <div className="flex gap-2">
            <button onClick={handleConfirm} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "#D97706", color: "#fff" }}>
              Confirm
            </button>
            <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "rgba(0,0,0,0.06)", color: "#64748B" }}>
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (msg.card === "text") {
      return (
        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1c1e21" }}>
          {msg.text}
        </div>
      );
    }

    return (
      <div>
        {msg.cost ? (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#D97706" }}>{actionLabel(msg.intent || "")}</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(217,119,6,0.1)", color: "#D97706" }}>{msg.cost} cr</span>
          </div>
        ) : null}
        {msg.images?.length ? (
          <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.08)", maxWidth: "480px" }}>
            <img src={msg.images[0]} alt="Generated creative" className="w-full object-contain bg-black" />
          </div>
        ) : null}
        {msg.text && msg.card !== "creative" ? <AIOutput content={msg.text} /> : null}
        {msg.text && msg.card === "creative" && !msg.images?.length ? (
          <p className="text-sm" style={{ color: "#1c1e21" }}>{msg.text}</p>
        ) : null}
        {renderActions(msg) ? (
          <div className="mt-4 flex flex-wrap gap-2">{renderActions(msg)}</div>
        ) : null}
      </div>
    );
  }

  if (!hasSetup) {
    return (
      <main className="min-h-screen flex flex-col pt-14 md:pt-12">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-white font-bold text-lg mb-2">Set up your business first</p>
          <p className="text-sm mb-6" style={{ color: "#64748B" }}>Advanced mode needs your business profile to generate results.</p>
          <button onClick={() => router.push("/")} className="px-6 py-3 rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
            Go to Setup
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col pt-14 md:pt-12 overflow-hidden" style={{ background: "#F9F9F8" }}>
      <div className="flex flex-1 overflow-hidden">
        <ConversationSidebar
          refreshKey={sessionsRefreshKey}
          onSessionChange={() => {
            setPendingIntent(null);
            setNotice("");
          }}
        />

        {/* Main chat column */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">

          {notice && (
            <div className="flex-shrink-0 px-6 py-2 text-xs font-semibold text-center" style={{ color: "#D97706", background: "rgba(217,119,6,0.06)", borderBottom: "1px solid rgba(217,119,6,0.12)" }}>
              {notice}
            </div>
          )}

          {/* Messages */}
          <section className="min-h-0 flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-20 text-center">
                  <div className="w-14 h-14 rounded-2xl mb-6 flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p className="text-2xl font-bold mb-2" style={{ color: "#1c1e21" }}>How can I help your marketing?</p>
                  <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: "#64748B" }}>Tell me what you are working on. I can help you research, build angles, write copy, analyze results, or generate creatives.</p>
                </div>
              ) : null}

              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg shrink-0 mt-0.5 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                  )}
                  <div className={msg.role === "user" ? "max-w-xl" : "flex-1 min-w-0"}>
                    {msg.role === "user" ? (
                      <div className="rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap" style={{ background: "#1877F2", color: "#ffffff" }}>
                        {msg.images?.length ? <img src={msg.images[0]} alt="Attachment" className="mb-2 max-h-52 rounded-lg object-contain bg-black" /> : null}
                        {msg.text || "Attached image"}
                      </div>
                    ) : renderAssistantMessage(msg)}
                  </div>
                </div>
              ))}

              {streamingText && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg shrink-0 mt-0.5 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <div className="flex-1 min-w-0 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#1c1e21" }}>
                    {streamingText}
                    <span className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "#D97706" }} />
                  </div>
                </div>
              )}

              {loading && !streamingText && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p className="text-sm italic pt-2" style={{ color: "#94A3B8" }}>{loadingPhrase}</p>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </section>

          {/* Composer — Claude-style floating box */}
          <div className="flex-shrink-0 px-6 pb-6 pt-3" style={{ background: "#F9F9F8" }}>
            <div className="max-w-3xl mx-auto">
              {attachedImage && (
                <div className="mb-2 flex items-center gap-2 px-1">
                  <img src={attachedImage} alt="Attachment preview" className="w-14 h-14 rounded-lg object-cover" />
                  <button onClick={() => setAttachedImage(null)} className="text-xs font-medium" style={{ color: "#94A3B8" }}>Remove</button>
                </div>
              )}

              <div className="flex items-end gap-2 rounded-2xl px-4 py-3 shadow-sm" style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)" }}>
                <label className="cursor-pointer p-1.5 rounded-lg shrink-0 transition-all hover:brightness-95" style={{ background: "rgba(0,0,0,0.04)" }}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageAttach} />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </label>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Message Hilas AI..."
                  rows={1}
                  className="flex-1 resize-none text-sm focus:outline-none bg-transparent"
                  style={{ color: "#1c1e21", maxHeight: "160px", lineHeight: "1.6" }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && !attachedImage) || loading || !activeSessionId}
                  className="p-2 rounded-lg shrink-0 transition-all disabled:opacity-30"
                  style={{ background: "linear-gradient(135deg, #1877F2, #D97706)" }}
                  aria-label="Send"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                </button>
              </div>
              <p className="text-center text-xs mt-2" style={{ color: "#CBD5E1" }}>Hilas AI can make mistakes. Verify important outputs.</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
