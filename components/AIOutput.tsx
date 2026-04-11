"use client";

interface Props {
  content: string;
  loading?: boolean;
  loadingText?: string;
}

export default function AIOutput({ content, loading, loadingText = "Thinking..." }: Props) {
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-sm">{loadingText}</span>
        </div>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <div className="prose prose-invert prose-sm max-w-none">
        {content.split("\n").map((line, i) => {
          // Dividers
          if (line.trim() === "---" || line.trim() === "***") {
            return <div key={i} className="h-px bg-gray-700 my-3" />;
          }
          // H1
          if (line.startsWith("# ")) {
            return <h1 key={i} className="text-white font-bold text-lg mt-5 mb-2">{line.replace(/^# /, "")}</h1>;
          }
          // H2
          if (line.startsWith("## ")) {
            return <h2 key={i} className="text-blue-400 font-bold text-base mt-4 mb-2">{line.replace(/^## /, "")}</h2>;
          }
          // H3
          if (line.startsWith("### ")) {
            return <h3 key={i} className="text-gray-300 font-semibold text-sm mt-3 mb-1">{line.replace(/^### /, "")}</h3>;
          }
          // Bold-only line
          if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
            return <p key={i} className="font-bold text-white text-sm mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
          }
          // Bullet points
          if (line.startsWith("- ")) {
            return <p key={i} className="text-gray-300 text-sm pl-3 before:content-['•'] before:mr-2 before:text-blue-400">{line.replace(/^- /, "")}</p>;
          }
          // Numbered list
          if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\.\s/)?.[1];
            const text = line.replace(/^\d+\.\s/, "");
            return <p key={i} className="text-gray-300 text-sm pl-3"><span className="text-blue-400 font-semibold mr-2">{num}.</span>{text}</p>;
          }
          // Empty line
          if (line.trim() === "") {
            return <div key={i} className="h-2" />;
          }
          // Inline bold
          if (line.includes("**")) {
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p key={i} className="text-gray-300 text-sm leading-relaxed">
                {parts.map((part, j) =>
                  part.startsWith("**") && part.endsWith("**")
                    ? <strong key={j} className="text-white font-semibold">{part.replace(/\*\*/g, "")}</strong>
                    : part
                )}
              </p>
            );
          }
          // Plain text
          return <p key={i} className="text-gray-300 text-sm leading-relaxed">{line}</p>;
        })}
      </div>
    </div>
  );
}
