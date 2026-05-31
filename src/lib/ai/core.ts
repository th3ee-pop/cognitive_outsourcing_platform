import type { AiChatRole } from "@/lib/types";

export type DeepSeekStreamEvent =
  | { type: "delta"; content: string; reasoningContent: string }
  | { type: "usage"; usage: Record<string, unknown> }
  | { type: "done" };

export type DeepSeekMessage = {
  role: AiChatRole;
  content: string;
};

export function makeConversationTitle(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) return "新的 AI 对话";
  return normalized.length > 19 ? `${normalized.slice(0, 19)}…` : normalized;
}

export function parseDeepSeekStreamLine(line: string): DeepSeekStreamEvent | null {
  if (!line.startsWith("data:")) return null;
  const payload = line.slice(5).trim();
  if (!payload) return null;
  if (payload === "[DONE]") return { type: "done" };

  const parsed = JSON.parse(payload) as {
    choices?: Array<{ delta?: { content?: string | null; reasoning_content?: string | null } }>;
    usage?: Record<string, unknown>;
  };

  if (parsed.usage && (!parsed.choices || parsed.choices.length === 0)) {
    return { type: "usage", usage: parsed.usage };
  }

  const delta = parsed.choices?.[0]?.delta;
  if (!delta) return null;
  return {
    type: "delta",
    content: delta.content ?? "",
    reasoningContent: delta.reasoning_content ?? ""
  };
}

export function toResearchSystemPrompt() {
  return [
    "你是认知外包学习实验平台中的 AI 对话助手。",
    "你的任务是帮助学生澄清问题、拆解任务、提出分析路径与表达建议。",
    "请避免替学生直接完成整份最终报告；优先通过提问、结构化反馈和可操作建议促进学生思考。",
    "回答应简洁、清晰，并尽量说明建议背后的依据。"
  ].join("\n");
}
