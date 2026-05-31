import { NextResponse } from "next/server";
import { makeConversationTitle, parseDeepSeekStreamLine, toResearchSystemPrompt } from "@/lib/ai/core";
import { getSessionUser } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AiMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type StreamPayload =
  | { type: "delta"; content: string }
  | { type: "done"; messageId?: string }
  | { type: "error"; error: string };

const encoder = new TextEncoder();

function encodeEvent(payload: StreamPayload) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  const { id } = await context.params;
  const userId = user.id;
  const supabase = getSupabaseAdmin();
  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (conversationError) return NextResponse.json({ error: conversationError.message }, { status: 500 });
  if (!conversation) return NextResponse.json({ error: "没有找到该对话。" }, { status: 404 });

  const { data, error } = await supabase
    .from("ai_messages")
    .select("id,conversation_id,role,content,token_count,created_at,metadata_json")
    .eq("conversation_id", id)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .returns<AiMessage[]>();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  if (user.must_change_password) return NextResponse.json({ error: "请先修改初始密码。" }, { status: 403 });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DeepSeek API Key 尚未配置，请先在服务端环境变量中添加 DEEPSEEK_API_KEY。" }, { status: 503 });
  }

  const { id } = await context.params;
  const userId = user.id;
  const body = await request.json().catch(() => ({}));
  const content = String(body.content || "").trim();
  if (!content) return NextResponse.json({ error: "请输入要发送的内容。" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .select("id,title,archived_at,task_stage")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (conversationError) return NextResponse.json({ error: conversationError.message }, { status: 500 });
  if (!conversation) return NextResponse.json({ error: "没有找到该对话。" }, { status: 404 });
  if (conversation.archived_at) return NextResponse.json({ error: "该对话已归档，无法继续发送消息。" }, { status: 409 });

  const { data: history, error: historyError } = await supabase
    .from("ai_messages")
    .select("role,content")
    .eq("conversation_id", id)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(40);

  if (historyError) return NextResponse.json({ error: historyError.message }, { status: 500 });

  const now = new Date().toISOString();
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-pro";
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;

  const { error: insertUserError } = await supabase.from("ai_messages").insert({
    conversation_id: id,
    user_id: userId,
    role: "user",
    content,
    metadata_json: { source: "lab_ui" }
  });

  if (insertUserError) return NextResponse.json({ error: insertUserError.message }, { status: 500 });

  const nextTitle = conversation.title === "新的 AI 对话" ? makeConversationTitle(content) : conversation.title;
  await supabase
    .from("ai_conversations")
    .update({ title: nextTitle, model, last_message_at: now, updated_at: now })
    .eq("id", id)
    .eq("user_id", userId);

  const messages = [
    { role: "system", content: toResearchSystemPrompt() },
    ...(history ?? []).map((message) => ({ role: message.role, content: message.content })),
    { role: "user", content }
  ].filter((message) => message.role !== "system" || message.content);

  const stream = new ReadableStream({
    async start(controller) {
      let assistantContent = "";
      let usage: Record<string, unknown> | null = null;
      let messageId: string | undefined;

      async function saveAssistant(status: "completed" | "interrupted", errorMessage?: string) {
        if (!assistantContent && status === "interrupted") return;
        const { data } = await supabase
          .from("ai_messages")
          .insert({
            conversation_id: id,
            user_id: userId,
            role: "assistant",
            content: assistantContent || "（本次回复未返回内容）",
            token_count: typeof usage?.total_tokens === "number" ? usage.total_tokens : null,
            metadata_json: {
              model,
              status,
              usage,
              error: errorMessage || null,
              reasoning_omitted: true
            }
          })
          .select("id")
          .single();
        messageId = data?.id;
        await supabase
          .from("ai_conversations")
          .update({ model, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", userId);
      }

      try {
        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            stream_options: { include_usage: true },
            thinking: { type: "disabled" },
            temperature: 0.7
          })
        });

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          throw new Error(detail || `DeepSeek 请求失败：${upstream.status}`);
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const parsed = parseDeepSeekStreamLine(line.trim());
            if (!parsed) continue;
            if (parsed.type === "done") break;
            if (parsed.type === "usage") {
              usage = parsed.usage;
              continue;
            }
            if (parsed.content) {
              assistantContent += parsed.content;
              controller.enqueue(encodeEvent({ type: "delta", content: parsed.content }));
            }
          }
        }

        await saveAssistant("completed");
        controller.enqueue(encodeEvent({ type: "done", messageId }));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI 回复生成失败。";
        await saveAssistant("interrupted", message);
        controller.enqueue(encodeEvent({ type: "error", error: message }));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
