"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Send } from "lucide-react";
import ChatPanel, { type ChatMessage, type MessageBlock } from "@/components/ChatPanel";
import FileUpload from "@/components/FileUpload";

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type ApiMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ArenaPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [input, setInput] = useState(initialQuery);
  const [files, setFiles] = useState<File[]>([]);
  const [vanillaMessages, setVanillaMessages] = useState<ChatMessage[]>([]);
  const [spinelMessages, setSpinelMessages] = useState<ChatMessage[]>([]);
  const [vanillaLoading, setVanillaLoading] = useState(false);
  const [spinelLoading, setSpinelLoading] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const [apiHistory, setApiHistory] = useState<ApiMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function streamChat(
    mode: "vanilla" | "spinel",
    messages: ApiMessage[],
    filePayloads: { name: string; content: string }[],
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
  ) {
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          mode,
          sessionId,
          files: filePayloads.length > 0 ? filePayloads : undefined,
        }),
      });

      if (!response.ok) throw new Error("API request failed");

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const blocks: MessageBlock[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === "done") continue;

          blocks.push(data as MessageBlock);

          setMessages((prev) => {
            const updated = [...prev];
            // Replace or add the assistant message
            if (updated[updated.length - 1]?.role === "assistant") {
              updated[updated.length - 1] = {
                role: "assistant",
                blocks: [...blocks],
              };
            } else {
              updated.push({ role: "assistant", blocks: [...blocks] });
            }
            return updated;
          });
        }
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          blocks: [{ type: "error", content: error.message }],
        },
      ]);
    }

    setLoading(false);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const query = input.trim();
    if (!query || vanillaLoading || spinelLoading) return;

    // Add user message to both panels
    const userMessage: ChatMessage = {
      role: "user",
      blocks: [
        { type: "text", content: query },
        ...files.map((f) => ({
          type: "text" as const,
          content: ` 📎 ${f.name}`,
        })),
      ],
    };

    setVanillaMessages((prev) => [...prev, userMessage]);
    setSpinelMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Build file payloads
    const filePayloads = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        content: await fileToBase64(f),
      }))
    );

    // Build API messages including file context
    const fileContext =
      files.length > 0
        ? `\n\nUploaded files: ${files.map((f) => f.name).join(", ")}. Files are available at /home/user/{filename}.`
        : "";

    const newApiMessage: ApiMessage = {
      role: "user",
      content: query + fileContext,
    };
    const updatedHistory = [...apiHistory, newApiMessage];
    setApiHistory(updatedHistory);

    // Clear files after sending
    setFiles([]);

    // Fire both requests in parallel
    streamChat("vanilla", updatedHistory, filePayloads, setVanillaMessages, setVanillaLoading);
    streamChat("spinel", updatedHistory, filePayloads, setSpinelMessages, setSpinelLoading);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-3 border-b border-gray-800 flex items-center justify-between">
        <a href="/" className="text-white font-semibold">
          Spinel Arena
        </a>
        <span className="text-xs text-gray-600">
          Same model · Same data · Different expertise
        </span>
      </header>

      {/* Chat panels */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0">
        <ChatPanel
          title="Standard Claude"
          label="VANILLA"
          messages={vanillaMessages}
          isLoading={vanillaLoading}
          accentColor="#6b7280"
        />
        <ChatPanel
          title="Claude + Spinel"
          label="SPINEL"
          messages={spinelMessages}
          isLoading={spinelLoading}
          accentColor="#3b82f6"
        />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <FileUpload files={files} onFilesChange={setFiles} />
          <form onSubmit={handleSubmit} className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about materials, upload data files, or try an example from the home page..."
              rows={2}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500"
            />
            <button
              type="submit"
              disabled={vanillaLoading || spinelLoading || !input.trim()}
              className="px-4 rounded-xl bg-spinel-600 hover:bg-spinel-700 disabled:bg-gray-800 disabled:text-gray-600 text-white transition-colors flex items-center"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
