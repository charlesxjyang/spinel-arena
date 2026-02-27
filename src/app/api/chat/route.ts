/**
 * POST /api/chat
 *
 * Handles a single chat request for one panel (vanilla or spinel).
 * The frontend calls this twice in parallel — once per panel.
 *
 * Request body:
 * {
 *   messages: Message[],
 *   mode: "vanilla" | "spinel",
 *   sessionId: string,
 *   files?: { name: string, content: string }[]  // base64 encoded
 * }
 *
 * Returns a streaming response with text chunks and tool results.
 */

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSpinelSystemPrompt, VANILLA_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  getOrCreateSandbox,
  executeCode,
  uploadFileToSandbox,
  type SandboxMode,
} from "@/lib/sandbox";
import {
  ensureSession,
  saveUserMessage,
  saveAssistantMessage,
  saveUploadedFile,
} from "@/lib/persistence";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CODE_EXECUTION_TOOL: Anthropic.Tool = {
  name: "execute_python",
  description:
    "Execute Python code in a sandboxed environment. Use this to analyze data, create plots, run calculations, and process uploaded files. Files are at /home/user/{filename}. Save plots with plt.savefig('/home/user/plot.png') and they will be displayed.",
  input_schema: {
    type: "object" as const,
    properties: {
      code: {
        type: "string",
        description: "Python code to execute",
      },
    },
    required: ["code"],
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      mode,
      sessionId,
      files,
    }: {
      messages: Anthropic.MessageParam[];
      mode: SandboxMode;
      sessionId: string;
      files?: { name: string; content: string }[];
    } = body;

    // Persist session and uploaded files (fire-and-forget)
    ensureSession(sessionId);
    if (files && files.length > 0) {
      for (const file of files) {
        saveUploadedFile(sessionId, file.name, file.content);
      }
    }

    // Get or create sandbox
    const sandbox = await getOrCreateSandbox(sessionId, mode);

    // Upload any new files to sandbox
    if (files && files.length > 0) {
      for (const file of files) {
        const buffer = Buffer.from(file.content, "base64");
        await uploadFileToSandbox(sandbox, file.name, buffer);
      }
    }

    const systemPrompt =
      mode === "spinel" ? await getSpinelSystemPrompt() : VANILLA_SYSTEM_PROMPT;

    // Save user message (fire-and-forget) — extract text from last message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const userText =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : Array.isArray(lastMessage.content)
            ? lastMessage.content
                .filter((b: any) => b.type === "text")
                .map((b: any) => b.text)
                .join("\n")
            : "";
      if (userText) {
        saveUserMessage(sessionId, mode, userText);
      }
    }

    // Create streaming encoder
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Agentic loop: keep going until Claude stops calling tools
          let currentMessages = [...messages];
          let maxIterations = 10; // safety limit
          const allStreamedBlocks: unknown[] = [];

          while (maxIterations-- > 0) {
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-5-20250514",
              max_tokens: 4096,
              system: systemPrompt,
              tools: [CODE_EXECUTION_TOOL],
              messages: currentMessages,
            });

            // Process content blocks
            let hasToolUse = false;
            const assistantContent: Anthropic.ContentBlock[] = [];

            for (const block of response.content) {
              assistantContent.push(block);

              if (block.type === "text") {
                allStreamedBlocks.push({ type: "text", content: block.text });
                // Stream text to frontend
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "text", content: block.text })}\n\n`
                  )
                );
              } else if (block.type === "tool_use") {
                hasToolUse = true;
                const code = (block.input as { code: string }).code;
                allStreamedBlocks.push({ type: "code", content: code });

                // Stream the code block to frontend
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: "code", content: code })}\n\n`
                  )
                );

                // Execute in sandbox
                const result = await executeCode(sandbox, code);

                // Stream execution results
                if (result.text) {
                  allStreamedBlocks.push({ type: "output", content: result.text });
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "output", content: result.text })}\n\n`
                    )
                  );
                }
                if (result.error) {
                  allStreamedBlocks.push({ type: "error", content: result.error });
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "error", content: result.error })}\n\n`
                    )
                  );
                }
                for (const img of result.images) {
                  allStreamedBlocks.push({ type: "image", content: "[base64]" });
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "image", content: img })}\n\n`
                    )
                  );
                }

                // Build tool result for next iteration
                const toolResultContent = [
                  result.text ? `Output:\n${result.text}` : "",
                  result.error ? `Error:\n${result.error}` : "",
                  result.images.length > 0
                    ? `[${result.images.length} plot(s) generated and displayed]`
                    : "",
                ]
                  .filter(Boolean)
                  .join("\n\n");

                // Append assistant message and tool result
                currentMessages = [
                  ...currentMessages,
                  { role: "assistant" as const, content: assistantContent },
                  {
                    role: "user" as const,
                    content: [
                      {
                        type: "tool_result" as const,
                        tool_use_id: block.id,
                        content: toolResultContent || "Code executed successfully.",
                      },
                    ],
                  },
                ];
              }
            }

            // If no tool use, we're done
            if (!hasToolUse) {
              break;
            }
          }

          // Save assistant message (fire-and-forget)
          const textContent = allStreamedBlocks
            .filter((b: any) => b.type === "text")
            .map((b: any) => b.content)
            .join("\n");
          if (textContent || allStreamedBlocks.length > 0) {
            saveAssistantMessage(sessionId, mode, textContent, allStreamedBlocks);
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
          );
          controller.close();
        } catch (error: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: error.message })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
