"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase/client";

interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  label: string | null;
  angle: string | null;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
}

function storagePathFromUrl(url: string): string | null {
  // Extract the path after /object/public/ad-creative/
  const match = url.match(/\/object\/public\/ad-creative\/(.+)/);
  return match ? match[1] : null;
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
}

export default function LibraryPage() {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/home"); return; }

    const { data } = await supabase
      .from("media_library")
      .select("id, type, url, label, angle, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setItems((data as MediaItem[]) || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(item: MediaItem) {
    setDeleting(item.id);
    const supabase = createClient();

    // Optimistic remove
    setItems(prev => prev.filter(i => i.id !== item.id));

    // Delete from DB
    await supabase.from("media_library").delete().eq("id", item.id);

    // Delete from storage
    const storagePath = storagePathFromUrl(item.url);
    if (storagePath) {
      await supabase.storage.from("ad-creative").remove([storagePath]);
    }

    setDeleting(null);
  }

  const filtered = filter === "all" ? items : items.filter(i => i.type === filter);
  const imageCount = items.filter(i => i.type === "image").length;
  const videoCount = items.filter(i => i.type === "video").length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4" style={{ background: "#0F1E35", border: "1px solid #1E2D45" }}>
              <span className="text-blue-300 text-xs font-medium">🗂 Media Library</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Your Generated Media</h1>
            <p className="text-gray-400 text-sm">All your images and video clips — saved permanently.</p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-6">
            {(["all", "image", "video"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === tab ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
              >
                {tab === "all" ? `All (${items.length})` : tab === "image" ? `Images (${imageCount})` : `Videos (${videoCount})`}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-24">
              <div className="text-4xl mb-4">{filter === "video" ? "🎬" : "🖼"}</div>
              <p className="text-white font-semibold text-sm mb-1">
                {filter === "all" ? "No media yet" : filter === "image" ? "No images yet" : "No videos yet"}
              </p>
              <p className="text-gray-500 text-xs mb-5">
                {filter === "all" ? "Generate your first image or video in Creative." : `Generate ${filter}s in the Creative tab.`}
              </p>
              <button
                onClick={() => router.push("/creative")}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold"
              >
                Go to Creative
              </button>
            </div>
          )}

          {/* Grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className="group rounded-xl overflow-hidden border transition-all hover:border-blue-700"
                  style={{ background: "#0F172A", border: "1px solid #1E2D45" }}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square bg-gray-900 overflow-hidden">
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt={item.label || "Ad creative"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={item.url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                        onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                    )}

                    {/* Type badge */}
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={item.type === "video"
                          ? { background: "rgba(124,58,237,0.85)", color: "#E9D5FF" }
                          : { background: "rgba(236,72,153,0.85)", color: "#FCE7F3" }
                        }>
                        {item.type === "video" ? "🎬 Video" : "🖼 Image"}
                      </span>
                    </div>

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => downloadFile(item.url, `hinilas-${item.label?.toLowerCase().replace(/\s/g, "-") || "media"}.${item.type === "video" ? "mp4" : "png"}`)}
                        className="bg-white text-black px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-100"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        disabled={deleting === item.id}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Info strip */}
                  <div className="px-3 py-2.5">
                    <p className="text-white text-xs font-semibold truncate">{item.label || "Ad Creative"}</p>
                    {item.angle && (
                      <p className="text-gray-500 text-[10px] truncate mt-0.5">{item.angle}</p>
                    )}
                    <p className="text-gray-600 text-[10px] mt-1">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
