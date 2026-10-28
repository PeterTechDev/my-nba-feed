export function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[a-f\d]+);/gi, (entity) => {
      const named: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
      if (named[entity]) return named[entity];
      const hex = entity.toLowerCase().startsWith("&#x");
      const code = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }).trim();
}
