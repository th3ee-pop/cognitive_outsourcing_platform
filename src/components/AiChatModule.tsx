"use client";

import { Archive, Bot, Check, Copy, MessageSquare, Plus, Search, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { parseMarkdownBlocks, type MarkdownInline } from "@/lib/ai/markdown";
import type { AiConversation, AiMessage } from "@/lib/types";

const taskStages = ["任务探索", "问题拆解", "资料理解", "分析设计", "结果解释", "报告表达", "检查修订"];

type StreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; messageId?: string }
  | { type: "error"; error: string };

export function AiChatModule({ compact, markDone }: { compact: boolean; markDone: () => void }) {
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [activeId, setActiveId] = useState("");
  const [archivedView, setArchivedView] = useState(false);
  const [stage, setStage] = useState(taskStages[0]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const skipNextMessageLoadRef = useRef("");

  const activeConversation = conversations.find((item) => item.id === activeId);
  const assistantMessages = useMemo(() => messages.filter((message) => message.role === "assistant"), [messages]);

  useEffect(() => {
    loadConversations();
  }, [archivedView]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    if (skipNextMessageLoadRef.current === activeId) {
      skipNextMessageLoadRef.current = "";
      return;
    }
    loadMessages(activeId);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function loadConversations(selectFirst = true) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/ai/conversations?archived=${archivedView ? "true" : "false"}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "读取对话失败。");
      return;
    }
    const next = data.conversations ?? [];
    setConversations(next);
    if (selectFirst && (!activeId || !next.some((item: AiConversation) => item.id === activeId))) {
      setActiveId(next[0]?.id ?? "");
    }
  }

  async function loadMessages(conversationId: string) {
    setError("");
    const res = await fetch(`/api/ai/conversations/${conversationId}/messages`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "读取消息失败。");
      return;
    }
    setMessages(data.messages ?? []);
  }

  async function createConversation(options: { clearMessages?: boolean } = {}) {
    setError("");
    const res = await fetch("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "新的 AI 对话", task_stage: stage })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "新建对话失败。");
      return "";
    }
    const conversation = data.conversation as AiConversation;
    setArchivedView(false);
    setConversations((prev) => [conversation, ...prev]);
    skipNextMessageLoadRef.current = conversation.id;
    setActiveId(conversation.id);
    if (options.clearMessages ?? true) setMessages([]);
    return conversation.id;
  }

  async function ensureConversation() {
    if (activeId && !archivedView) return activeId;
    return createConversation({ clearMessages: false });
  }

  async function sendMessage() {
    const content = input.trim();
    if (!content || streaming) return;

    const conversationId = await ensureConversation();
    if (!conversationId) return;

    setInput("");
    setError("");
    setStreaming(true);
    const now = new Date().toISOString();
    const tempUser: AiMessage = {
      id: `user-${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      content,
      token_count: null,
      created_at: now,
      metadata_json: {}
    };
    const tempAssistant: AiMessage = {
      id: `assistant-${Date.now()}`,
      conversation_id: conversationId,
      role: "assistant",
      content: "",
      token_count: null,
      created_at: now,
      metadata_json: { streaming: true }
    };
    setMessages((prev) => [...prev, tempUser, tempAssistant]);

    try {
      const res = await fetch(`/api/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI 回复生成失败。");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const line = event.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          const payload = JSON.parse(line.slice(5).trim()) as StreamEvent;
          if (payload.type === "delta") {
            setMessages((prev) =>
              prev.map((message) => (message.id === tempAssistant.id ? { ...message, content: message.content + payload.content } : message))
            );
          }
          if (payload.type === "error") throw new Error(payload.error);
        }
      }

      markDone();
      await loadConversations(false);
      await loadMessages(conversationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI 回复生成失败。";
      setError(message);
      setMessages((prev) =>
        prev.map((item) => (item.id === tempAssistant.id && !item.content ? { ...item, content: "回复生成中断，请稍后重试。" } : item))
      );
    } finally {
      setStreaming(false);
    }
  }

  async function archiveActive() {
    if (!activeId) return;
    setError("");
    const res = await fetch(`/api/ai/conversations/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !archivedView })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "归档失败。");
      return;
    }
    setActiveId("");
    await loadConversations();
  }

  async function copyMessage(message: AiMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(""), 1400);
    if (!message.id.startsWith("assistant-")) {
      await fetch(`/api/ai/messages/${message.id}/copy`, { method: "POST" });
    }
  }

  return (
    <section style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "300px minmax(0, 1fr) 300px", height: "100%", minWidth: 0 }}>
      {!compact && (
        <aside style={{ borderRight: "1px solid var(--border)", background: "var(--surface)", padding: "20px 16px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>对话档案</div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
                CHAT RECORDS
              </div>
            </div>
            <button className="soft-btn" onClick={() => createConversation()} style={{ minHeight: 30, fontSize: 12, padding: "0 10px" }}>
              <Plus size={12} /> 新对话
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", fontSize: 12.5, marginBottom: 12 }}>
            <Search size={14} /> 所有内容自动留存
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
            <button className={!archivedView ? "soft-btn" : "ghost-btn"} onClick={() => setArchivedView(false)} style={{ minHeight: 32, fontSize: 12 }}>
              当前
            </button>
            <button className={archivedView ? "soft-btn" : "ghost-btn"} onClick={() => setArchivedView(true)} style={{ minHeight: 32, fontSize: 12 }}>
              归档
            </button>
          </div>
          <div style={{ display: "grid", gap: 8, overflow: "auto", paddingRight: 2 }}>
            {loading && <div className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>读取中…</div>}
            {!loading && conversations.length === 0 && (
              <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: 14, color: "var(--muted)", fontSize: 12.5, lineHeight: 1.6 }}>
                {archivedView ? "暂无归档对话。" : "暂无对话，点击新对话开始记录。"}
              </div>
            )}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setActiveId(conversation.id)}
                style={{
                  display: "grid",
                  gap: 5,
                  width: "100%",
                  border: `1px solid ${conversation.id === activeId ? "color-mix(in oklch, var(--accent) 45%, var(--border))" : "var(--border)"}`,
                  background: conversation.id === activeId ? "var(--accent-soft)" : "var(--bg)",
                  borderRadius: 8,
                  padding: "11px 12px",
                  textAlign: "left",
                  color: "var(--fg)"
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conversation.title}</span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>
                  {conversation.task_stage || "任务探索"} · {formatTime(conversation.last_message_at || conversation.updated_at)}
                </span>
              </button>
            ))}
          </div>
        </aside>
      )}

      <div style={{ display: "grid", gridTemplateRows: "auto minmax(0, 1fr) auto", minWidth: 0, minHeight: 0, background: "var(--bg)" }}>
        <div style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)", padding: compact ? "12px 14px" : "16px 22px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
            <Bot size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeConversation?.title || "AI 对话记录"}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>
              STREAMING · DEEPSEEK · ALL MESSAGES SAVED
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <select className="field" value={stage} onChange={(event) => setStage(event.target.value)} style={{ width: compact ? 128 : 156, padding: "8px 10px", fontSize: 12.5 }}>
            {taskStages.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button className="icon-btn" onClick={archiveActive} disabled={!activeId} title={archivedView ? "取消归档" : "归档对话"}>
            <Archive size={16} />
          </button>
        </div>

        <div ref={scrollRef} style={{ overflow: "auto", padding: compact ? "18px 14px" : "28px 34px", display: "grid", alignContent: "start", gap: 14 }}>
          {!activeId && messages.length === 0 && (
            <div className="panel" style={{ maxWidth: 620, justifySelf: "center", marginTop: 56, padding: 28, textAlign: "center" }}>
              <div style={{ width: 50, height: 50, margin: "0 auto 14px", borderRadius: 12, display: "grid", placeItems: "center", background: "var(--accent-soft)", color: "var(--accent-deep)" }}>
                <MessageSquare size={22} />
              </div>
              <h2 style={{ margin: "0 0 8px", fontSize: 21 }}>开始一次可留存的 AI 互动</h2>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.75, fontSize: 14 }}>
                新建或直接输入消息后，系统会保存完整对话、任务阶段、模型信息与复制行为。
              </p>
            </div>
          )}
          {messages.map((message) => {
            const assistant = message.role === "assistant";
            return (
              <div key={message.id} style={{ justifySelf: assistant ? "start" : "end", maxWidth: compact ? "92%" : "72%", display: "grid", gap: 6 }}>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", textAlign: assistant ? "left" : "right" }}>
                  {assistant ? "AI ASSISTANT" : "YOU"} · {formatTime(message.created_at)}
                </div>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    background: assistant ? "var(--surface)" : "var(--accent)",
                    color: assistant ? "var(--fg)" : "#fff",
                    padding: "13px 15px",
                    lineHeight: 1.75,
                    fontSize: 14,
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {assistant ? <MarkdownContent content={message.content} streaming={streaming && !message.content} /> : message.content}
                </div>
                {assistant && message.content && (
                  <button className="ghost-btn" onClick={() => copyMessage(message)} style={{ justifySelf: "start", minHeight: 28, padding: "0 10px", fontSize: 12 }}>
                    {copiedId === message.id ? <Check size={13} /> : <Copy size={13} />}
                    {copiedId === message.id ? "已复制" : "复制"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: compact ? 12 : "14px 22px" }}>
          {error && <div className="message-error" style={{ marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10 }}>
            <textarea
              className="field"
              value={input}
              rows={compact ? 2 : 3}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") sendMessage();
              }}
              disabled={streaming || archivedView}
              placeholder={archivedView ? "归档对话不可继续发送。" : "输入你希望 AI 协助思考的问题…"}
              style={{ resize: "none", minHeight: compact ? 54 : 72 }}
            />
            <button className="primary-btn" onClick={sendMessage} disabled={streaming || archivedView || !input.trim()} style={{ alignSelf: "end", minHeight: compact ? 42 : 72, padding: compact ? "0 13px" : "0 18px" }}>
              <Send size={15} />
              {!compact && (streaming ? "生成中" : "发送")}
            </button>
          </div>
        </div>
      </div>

      {!compact && (
        <aside style={{ borderLeft: "1px solid var(--border)", background: "var(--subtle)", padding: "18px 16px", minWidth: 0 }}>
          <div className="panel" style={{ padding: "20px 18px", display: "grid", gap: 17 }}>
            <Meta label="当前阶段" value={stage} />
            <Meta label="模型配置" value={activeConversation?.model || "deepseek-v4-pro"} />
            <Meta label="消息数量" value={String(messages.length)} />
            <Meta label="AI 回复" value={String(assistantMessages.length)} />
            <Meta label="留存状态" value="自动保存" />
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, color: "var(--muted)", fontSize: 12.5, lineHeight: 1.7 }}>
              复制按钮会记录行为事件，归档不会删除任何对话文本。
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function MarkdownContent({ content, streaming }: { content: string; streaming: boolean }) {
  if (streaming) return <ThinkingDots />;
  const blocks = parseMarkdownBlocks(content);
  if (!blocks.length) return null;

  return (
    <div className="markdown-content">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Tag = (`h${block.level}` as "h1" | "h2" | "h3");
          return <Tag key={index}>{renderInline(block.children)}</Tag>;
        }
        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </Tag>
          );
        }
        if (block.type === "code") {
          return <pre key={index}><code>{block.text}</code></pre>;
        }
        return <p key={index}>{renderInline(block.children)}</p>;
      })}
    </div>
  );
}

function renderInline(nodes: MarkdownInline[]): ReactNode {
  return nodes.map((node, index) => {
    if (node.type === "strong") return <strong key={index}>{renderInline(node.children)}</strong>;
    if (node.type === "em") return <em key={index}>{renderInline(node.children)}</em>;
    if (node.type === "code") return <code key={index}>{node.text}</code>;
    return <span key={index}>{node.text}</span>;
  });
}

function ThinkingDots() {
  return (
    <span className="thinking-dots" aria-label="AI 正在思考">
      <span />
      <span />
      <span />
    </span>
  );
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
