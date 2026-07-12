import type { ReactNode } from "react";

type SafeMarkdownProps = {
  children: string | null | undefined;
  className?: string;
};

const bulletPattern = /^\s*[-*+]\s+(.+)$/;

export function SafeMarkdown({ children, className = "" }: SafeMarkdownProps) {
  const markdown = children?.trim();
  if (!markdown) return null;

  return <div className={className}>{renderBlocks(markdown)}</div>;
}

function renderBlocks(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join("\n").trim();
    if (text) blocks.push(<p key={`p-${blocks.length}`}>{renderInline(text)}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {list.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
      </ul>,
    );
    list = [];
  };

  for (const line of lines) {
    const bullet = line.match(bulletPattern);

    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderInline(text: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(...renderLineBreaks(text.slice(cursor, match.index), nodes.length));

    const token = match[0];
    const key = `inline-${match.index}-${nodes.length}`;
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(<strong key={key} className="font-semibold text-inherit">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key} className="rounded border border-border/70 bg-bg/60 px-1 py-0.5 font-mono text-[0.92em] text-inherit">{token.slice(1, -1)}</code>);
    } else {
      nodes.push(<em key={key} className="italic text-inherit">{token.slice(1, -1)}</em>);
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < text.length) nodes.push(...renderLineBreaks(text.slice(cursor), nodes.length));

  return nodes;
}

function renderLineBreaks(text: string, offset: number) {
  return text.split("\n").flatMap((part, index) => (
    index === 0 ? [part] : [<br key={`br-${offset}-${index}`} />, part]
  ));
}
