import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "RecipeBank";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            background: "#18181b",
            border: "1.5px solid #27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="64" height="64" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <line x1="10" y1="5" x2="10" y2="11" stroke="#f4f4f5" stroke-width="1.4" stroke-linecap="round"/>
            <line x1="12.5" y1="5" x2="12.5" y2="11" stroke="#f4f4f5" stroke-width="1.4" stroke-linecap="round"/>
            <line x1="15" y1="5" x2="15" y2="11" stroke="#f4f4f5" stroke-width="1.4" stroke-linecap="round"/>
            <path d="M10 11 Q12.5 13.5 15 11 L15 13.5 Q12.5 16 10 13.5 Z" fill="#f4f4f5"/>
            <line x1="12.5" y1="15" x2="12.5" y2="27" stroke="#f4f4f5" stroke-width="1.4" stroke-linecap="round"/>
            <path d="M19.5 5 C22.5 5 23.5 9 22.5 14 L19.5 14 Z" fill="#f4f4f5"/>
            <line x1="21" y1="14" x2="21" y2="27" stroke="#f4f4f5" stroke-width="1.4" stroke-linecap="round"/>
          </svg>
        </div>

        {/* Text */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 64, fontWeight: 700, color: "#f4f4f5", letterSpacing: "-2px" }}>
            RecipeBank
          </div>
          <div style={{ fontSize: 24, color: "#71717a", letterSpacing: "-0.5px" }}>
            Your personal recipe collection
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
