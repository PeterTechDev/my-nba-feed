import { ImageResponse } from "next/og";
import { getSiteUrl } from "@/lib/site";

export const shareImageSize = { width: 1200, height: 630 };

export const shareImageAlt =
  "NBA Feed. The result can wait. News, games, highlights and standings, with scores hidden until you reveal them.";

export function shareCard() {
  const host = getSiteUrl().host;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          fontFamily: "geist",
        }}
      >
        <div style={{ width: 16, height: "100%", backgroundColor: "#fcd34d" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 1184,
            padding: "64px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: "#fcd34d",
              }}
            />
            <div style={{ marginLeft: 16, fontSize: 28, color: "#fcd34d" }}>NBA FEED</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, lineHeight: 1.05 }}>The result can wait.</div>
            <div
              style={{
                marginTop: 24,
                fontSize: 32,
                lineHeight: 1.35,
                color: "rgba(255,255,255,0.72)",
                maxWidth: 920,
              }}
            >
              Your teams, the stories around them, and the games you are saving for later.
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.72)" }}>
              News, games, highlights, standings. Scores stay hidden until you reveal them.
            </div>
            <div style={{ marginTop: 12, fontSize: 22, color: "rgba(255,255,255,0.45)" }}>{host}</div>
          </div>
        </div>
      </div>
    ),
    { ...shareImageSize }
  );
}
