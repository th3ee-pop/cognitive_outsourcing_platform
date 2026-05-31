import assert from "node:assert/strict";
import test from "node:test";
import { makeConversationTitle, parseDeepSeekStreamLine } from "../src/lib/ai/core.ts";
import { parseMarkdownBlocks } from "../src/lib/ai/markdown.ts";

test("makeConversationTitle collapses whitespace and limits long prompts", () => {
  assert.equal(makeConversationTitle("  请帮我分析   认知外包 与  计算思维之间的关系，这里还有很多补充文字  "), "请帮我分析 认知外包 与 计算思维之间…");
});

test("makeConversationTitle falls back for blank prompts", () => {
  assert.equal(makeConversationTitle("   \n\t  "), "新的 AI 对话");
});

test("parseDeepSeekStreamLine extracts assistant content deltas", () => {
  const parsed = parseDeepSeekStreamLine('data: {"choices":[{"delta":{"content":"你好"}}]}');
  assert.deepEqual(parsed, { type: "delta", content: "你好", reasoningContent: "" });
});

test("parseDeepSeekStreamLine recognizes done markers and usage chunks", () => {
  assert.deepEqual(parseDeepSeekStreamLine("data: [DONE]"), { type: "done" });
  assert.deepEqual(parseDeepSeekStreamLine('data: {"choices":[],"usage":{"total_tokens":42}}'), {
    type: "usage",
    usage: { total_tokens: 42 }
  });
});

test("parseMarkdownBlocks recognizes headings, lists and bold text", () => {
  assert.deepEqual(parseMarkdownBlocks("## 分析步骤\n- **拆解**问题\n- 形成方案"), [
    { type: "heading", level: 2, children: [{ type: "text", text: "分析步骤" }] },
    {
      type: "list",
      ordered: false,
      items: [
        [
          { type: "strong", children: [{ type: "text", text: "拆解" }] },
          { type: "text", text: "问题" }
        ],
        [{ type: "text", text: "形成方案" }]
      ]
    }
  ]);
});
