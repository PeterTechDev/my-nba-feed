"use client";

interface Props {
  content: string;
  className?: string;
}

// Lightweight markdown renderer — handles the subset used by digest agents.
// Supports headings, emphasis, safe links, lists, blockquotes and paragraphs.
export default function MarkdownContent({ content, className = "" }: Props) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let keyCounter = 0;
  let firstHeadingLevel: number | undefined;
  let lastHeadingLevel = 2;

  const key = () => keyCounter++;

  const parseInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (link || /^https?:\/\//.test(part)) {
        try {
          const url = new URL(link?.[2] ?? part);
          if (url.protocol === "https:" || url.protocol === "http:") return <a key={idx} href={url.href} target="_blank" rel="noopener noreferrer" className="text-amber-200 underline underline-offset-4 break-words hover:text-amber-100">{link?.[1] ?? url.hostname.replace(/^www\./, "")}</a>;
        } catch { /* Malformed links stay readable as text. */ }
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={idx} className="italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines between blocks
    if (line.trim() === "") {
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6}) (.*)$/);
    if (heading) {
      const level = heading[1].length;
      // Digest cards own h2; keep authored headings beneath them without skipped levels.
      firstHeadingLevel ??= level;
      const headingLevel = Math.min(6, Math.max(3, level - firstHeadingLevel + 3), lastHeadingLevel + 1);
      lastHeadingLevel = headingLevel;
      const Heading = `h${headingLevel}` as `h${3 | 4 | 5 | 6}`;
      elements.push(
        <Heading key={key()} className={level === 1 ? "text-xl font-bold mt-6 mb-2 text-white" :
          level === 2 ? "text-lg font-bold mt-5 mb-2 text-white" : "text-base font-semibold mt-4 mb-1.5 text-white/90"}>
          {parseInline(heading[2])}
        </Heading>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={key()}
          className="border-l-2 pl-4 my-3 text-white/60 italic"
          style={{ borderColor: "var(--team-primary)" }}
        >
          {parseInline(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Unordered list — collect consecutive list items
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(
          <li key={key()} className="ml-1">
            {parseInline(lines[i].slice(2))}
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={key()} className="list-disc list-inside space-y-1 my-3 text-white/80">
          {items}
        </ul>
      );
      continue;
    }

    // Ordered list — collect consecutive
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(
          <li key={key()} className="ml-1">
            {parseInline(lines[i].replace(/^\d+\. /, ""))}
          </li>
        );
        i++;
      }
      elements.push(
        <ol key={key()} className="list-decimal list-inside space-y-1 my-3 text-white/80">
          {items}
        </ol>
      );
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      elements.push(<hr key={key()} className="border-white/10 my-4" />);
      i++;
      continue;
    }

    // Regular paragraph — collect until blank line
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" &&
      !/^(?:#{1,6} |> |- |\* |\d+\. )/.test(lines[i]) && !/^[-*_]{3,}$/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={key()} className="text-white/75 leading-relaxed my-3">
          {parseInline(paraLines.join(" "))}
        </p>
      );
    } else {
      // Unsupported block syntax must still consume a line.
      elements.push(<p key={key()} className="text-white/75 leading-relaxed my-3">{parseInline(line)}</p>);
      i++;
    }
  }

  return (
    <div className={`prose-digest ${className}`}>
      {elements}
    </div>
  );
}
