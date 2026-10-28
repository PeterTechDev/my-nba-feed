import { ImageResponse } from "next/og";

export function brandIcon(size: number) {
  const mark = Math.round(size * 0.72);
  const radius = Math.round(size * 0.18);
  const fontSize = Math.round(size * 0.2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
        }}
      >
        <div
          style={{
            width: mark,
            height: mark,
            borderRadius: radius,
            backgroundColor: "#fcd34d",
            color: "#0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize,
            fontFamily: "geist",
          }}
        >
          NBA
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
