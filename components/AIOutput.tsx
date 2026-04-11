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

  const isError = content.startsWith("Error:");

  if (isError) {
    return (
      <div className="rounded-xl p-5 border border-yellow-800 bg-yellow-950/40">
        <p className="text-yellow-400 font-semibold text-sm mb-1">⚡ We hit a small snag</p>
        <p className="text-yellow-200/70 text-sm">Our AI is a little busy right now. 🙏 Wait a few seconds and try again. It usually clears up fast! 🚀</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
      <div className="prose prose-invert prose-sm max-w-none">
        {content.split("\n").map((line, i) => {
          if (line.startsWith("## ")) {
            return <h2 key={i} className="text-blue-400 font-bold text-base mt-4 mb-2 first:mt-0">{line.replace("## ", "")}</h2>;
          }
          if (line.startsWith("# ")) {
            return <h1 key={i} className="text-white font-bold text-lg mt-4 mb-2 first:mt-0">{line.replace("# ", "")}</h1>;
          }
          if (line.startsWith("**") && line.endsWith("**")) {
            return <p key={i} className="font-bold text-white text-sm mt-3 mb-1">{line.replace(/\*\*/g, "")}</p>;
          }
          if (line.startsWith("- ")) {
            return <p key={i} className="text-gray-300 text-sm pl-3 before:content-['•'] before:mr-2 before:text-blue-400">{line.replace("- ", "")}</p>;
          }
          if (line.trim() === "") {
            return <div key={i} className="h-2" />;
          }
          // Handle inline bold
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
          return <p key={i} className="text-gray-300 text-sm leading-relaxed">{line}</p>;
        })}
      </div>
    </div>
  );
}
