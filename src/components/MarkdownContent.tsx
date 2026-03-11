"use client";

interface Props {
  content: string;
  className?: string;
}

// Lightweight markdown renderer — handles the subset used by digest agents.
// Supports: h1/h2/h3, bold, italic, unordered lists, blockquotes, paragraphs.
export default function MarkdownContent({ content, className = "" }: Props) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let keyCounter = 0;

  const key = () => keyCounter++;

  // Parse inline formatting (bold, italic)
  const parseInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
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

    // H1
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={key()} className="text-xl font-bold mt-6 mb-2 text-white">
          {parseInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key()} className="text-lg font-bold mt-5 mb-2 text-white">
          {parseInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={key()} className="text-base font-semibold mt-4 mb-1.5 text-white/90">
          {parseInline(line.slice(4))}
        </h3>
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
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].match(/^[#>*-]/) && !/^\d+\. /.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(
        <p key={key()} className="text-white/75 leading-relaxed my-3">
          {parseInline(paraLines.join(" "))}
        </p>
      );
    }
  }

  return (
    <div className={`prose-digest ${className}`}>
      {elements}
    </div>
  );
}
