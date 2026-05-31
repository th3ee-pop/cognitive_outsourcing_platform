export type MarkdownInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: MarkdownInline[] }
  | { type: "em"; children: MarkdownInline[] }
  | { type: "code"; text: string };

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; children: MarkdownInline[] }
  | { type: "paragraph"; children: MarkdownInline[] }
  | { type: "list"; ordered: boolean; items: MarkdownInline[][] }
  | { type: "code"; text: string };

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: MarkdownInline[][] } | null = null;
  let codeFence: string[] | null = null;

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", children: parseInline(paragraph.join(" ")) });
    paragraph = [];
  }

  function flushList() {
    if (!list) return;
    blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    list = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith("```")) {
      if (codeFence) {
        blocks.push({ type: "code", text: codeFence.join("\n") });
        codeFence = null;
      } else {
        flushParagraph();
        flushList();
        codeFence = [];
      }
      continue;
    }

    if (codeFence) {
      codeFence.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, children: parseInline(heading[2]) });
      continue;
    }

    const unorderedItem = /^[-*]\s+(.+)$/.exec(line);
    const orderedItem = /^\d+[.)]\s+(.+)$/.exec(line);
    const item = unorderedItem?.[1] ?? orderedItem?.[1];
    if (item) {
      flushParagraph();
      const ordered = Boolean(orderedItem);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(parseInline(item));
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  if (codeFence) blocks.push({ type: "code", text: codeFence.join("\n") });
  flushParagraph();
  flushList();
  return blocks;
}

function parseInline(text: string): MarkdownInline[] {
  const nodes: MarkdownInline[] = [];
  let index = 0;
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > index) {
      nodes.push({ type: "text", text: text.slice(index, match.index) });
    }
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push({ type: "strong", children: [{ type: "text", text: token.slice(2, -2) }] });
    } else if (token.startsWith("`")) {
      nodes.push({ type: "code", text: token.slice(1, -1) });
    } else {
      nodes.push({ type: "em", children: [{ type: "text", text: token.slice(1, -1) }] });
    }
    index = match.index + token.length;
  }

  if (index < text.length) {
    nodes.push({ type: "text", text: text.slice(index) });
  }
  return nodes.length ? nodes : [{ type: "text", text }];
}
