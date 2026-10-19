import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Second Look: take a second look before you ape";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "radial-gradient(circle at 50% -10%, #3a2a0c, #0a0a0b 60%)", color: "#ecebe6", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, color: "#bdbcb6" }}>
          <svg width="52" height="52" viewBox="0 0 32 32" fill="none">
            <circle cx="12" cy="16" r="8.5" stroke="#ecebe6" strokeOpacity="0.45" strokeWidth="2" />
            <circle cx="20" cy="16" r="8.5" stroke="#f5b84b" strokeWidth="2.4" />
            <circle cx="20" cy="16" r="2.6" fill="#f5b84b" />
          </svg>
          Second Look
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
          <div style={{ display: "flex" }}>
            Take a&nbsp;<span style={{ color: "#f5b84b" }}>second look</span>
          </div>
          <div style={{ display: "flex" }}>before you ape.</div>
        </div>
        <div style={{ fontSize: 28, color: "#8a8a85", display: "flex" }}>Token scanner for Robinhood Chain · dev wallet · whales · snipers · contract powers</div>
      </div>
    ),
    size,
  );
}
