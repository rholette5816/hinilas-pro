"use client";

interface Props {
  content: string;
  loading?: boolean;
  loadingText?: string;
}

function renderInline(text: string) {
  if (!text.includes("**") && !text.includes("*")) return text;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} className="text-gray-200">{part.slice(1, -1)}</em>;
    return part;
  });
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

  const lines = content.split("\n");

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <div className="space-y-1 text-sm leading-relaxed">
        {lines.map((line, i) => {
          const trimmed = line.trim();

          // Divider
          if (trimmed === "---" || trimmed === "***")
            return <div key={i} className="h-px bg-gray-700 my-4" />;

          // H1
          if (line.startsWith("# "))
            return <h1 key={i} className="text-white font-bold text-lg mt-6 mb-2 first:mt-0">{renderInline(line.slice(2))}</h1>;

          // H2
          if (line.startsWith("## "))
            return <h2 key={i} className="text-blue-400 font-bold text-sm uppercase tracking-wide mt-5 mb-2 first:mt-0">{renderInline(line.slice(3))}</h2>;

          // H3
          if (line.startsWith("### "))
            return <h3 key={i} className="text-gray-200 font-semibold mt-3 mb-1">{renderInline(line.slice(4))}</h3>;

          // Bullet
          if (line.startsWith("- "))
            return (
              <div key={i} className="flex gap-2.5 pl-1">
                <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                <span className="text-gray-300">{renderInline(line.slice(2))}</span>
              </div>
            );

          // Numbered list
          if (/^\d+\.\s/.test(line)) {
            const num = line.match(/^(\d+)\./)?.[1];
            const text = line.replace(/^\d+\.\s*/, "");
            return (
              <div key={i} className="flex gap-2.5 pl-1 mt-1">
                <span className="text-blue-400 font-bold shrink-0 w-5 text-right">{num}.</span>
                <span className="text-gray-300">{renderInline(text)}</span>
              </div>
            );
          }

          // Empty line — small gap
          if (trimmed === "")
            return <div key={i} className="h-2" />;

          // Bold-only line (acts as a label/heading)
          if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4)
            return <p key={i} className="text-white font-semibold mt-3 mb-1">{trimmed.slice(2, -2)}</p>;

          // Plain text (with inline bold support)
          return (
            <p key={i} className="text-gray-300 leading-relaxed">
              {renderInline(line)}
            </p>
          );
        })}
      </div>
    </div>
  );
}
