import { formatGameDate, formatTipoff } from "@/lib/nbaDate";
import { isDigestDate, type DigestEntry } from "@/lib/digest";

export function getDigestPresentation(digest: DigestEntry) {
  const sourceHeading = /^#{1,6} +Sources\s*$/im.exec(digest.content);
  const body = sourceHeading ? digest.content.slice(0, sourceHeading.index).trim() : digest.content;
  const sourceText = sourceHeading ? digest.content.slice(sourceHeading.index + sourceHeading[0].length).trim() : "";
  const candidate = sourceText.match(/League date:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  const coverageDate = isDigestDate(candidate) ? candidate : null;
  const title = coverageDate ? digest.title.replace(/^(NBA Morning Briefing):\s*\d{4}-\d{2}-\d{2}$/i, "$1") : digest.title;

  // Older editions store tipoffs in prose; keep these readable without rewriting the saved digest.
  const content = body.replace(/\b(\d{4}-\d{2}-\d{2})(?: at |[T ])(\d{2}:\d{2})(?::\d{2})?(?:\.\d+)?\s*(?:UTC|Z)\b/g,
    (original, date: string, time: string) => {
      const instant = `${date}T${time}:00Z`;
      if (!isDigestDate(date) || !Number.isFinite(Date.parse(instant))) return original;
      return `${formatGameDate(instant, { month: "short", day: "numeric", year: "numeric" })} at ${formatTipoff(instant)}`;
    });
  const sources = sourceText.replace(/^([^:\r\n]+):[ \t]*(https?:\/\/\S+)[ \t]*$/gm, "[$1]($2)");
  return { title, content, sources, coverageDate };
}
