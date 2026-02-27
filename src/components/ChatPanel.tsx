"use client";

import { useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export type MessageBlock =
  | { type: "text"; content: string }
  | { type: "code"; content: string }
  | { type: "output"; content: string }
  | { type: "error"; content: string }
  | { type: "image"; content: string }; // base64 PNG

export interface ChatMessage {
  role: "user" | "assistant";
  blocks: MessageBlock[];
}

interface ChatPanelProps {
  title: string;
  label: string;
  messages: ChatMessage[];
  isLoading: boolean;
  accentColor: string;
}

export default function ChatPanel({
  title,
  label,
  messages,
  isLoading,
  accentColor,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div
        className="px-4 py-3 border-b border-gray-200 flex items-center gap-3"
        style={{ borderTopColor: accentColor, borderTopWidth: 2 }}
      >
        <span
          className="text-xs font-mono px-2 py-0.5 rounded"
          style={{ backgroundColor: accentColor + "15", color: accentColor }}
        >
          {label}
        </span>
        <span className="text-sm text-gray-700 font-medium">{title}</span>
        {isLoading && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            <span className="animate-pulse">●</span> Generating...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-panel p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-400 text-sm text-center mt-20">
            Responses will appear here
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
            {msg.role === "user" ? (
              <div className="bg-gray-100 rounded-xl px-4 py-2.5 max-w-[85%] text-sm text-gray-800">
                {msg.blocks.map((b, j) => (
                  <span key={j}>{b.content}</span>
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-w-full">
                {msg.blocks.map((block, j) => (
                  <MessageBlockView key={j} block={block} />
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-1 text-gray-500 py-2">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
            <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
            <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBlockView({ block }: { block: MessageBlock }) {
  switch (block.type) {
    case "text":
      return (
        <div className="prose text-sm max-w-none">
          <ReactMarkdown>{block.content}</ReactMarkdown>
        </div>
      );
    case "code":
      return (
        <details className="group">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-600 flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform">▶</span>
            Code executed
          </summary>
          <pre className="mt-1 bg-gray-50 rounded-lg p-3 overflow-x-auto text-xs text-gray-700 border border-gray-200">
            <code>{block.content}</code>
          </pre>
        </details>
      );
    case "output":
      return (
        <pre className="bg-gray-50 rounded-lg p-3 overflow-x-auto text-xs text-green-700 border border-gray-200 max-h-48 overflow-y-auto">
          {block.content}
        </pre>
      );
    case "error":
      return (
        <pre className="bg-red-50 rounded-lg p-3 overflow-x-auto text-xs text-red-600 border border-red-200 max-h-48 overflow-y-auto">
          {block.content}
        </pre>
      );
    case "image":
      return (
        <img
          src={`data:image/png;base64,${block.content}`}
          alt="Generated plot"
          className="rounded-lg border border-gray-200 max-w-full"
        />
      );
  }
}
