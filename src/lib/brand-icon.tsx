import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const brandMark = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "branding", "my-nba-feed-mark-dark.png")).toString("base64")}`;

export function brandIcon(size: number) {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brandMark} alt="My NBA Feed" width={size} height={size} />,
    { width: size, height: size }
  );
}
