import { ImageResponse } from "next/og";
import { cachedScan } from "@/lib/cached";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Second Look token scan";

const COLOR = { clean: "#6fdc8c", careful: "#f5b84b", risky: "#ff6b5e" };
const GRADE = { clean: "LOOKS CLEAN", careful: "BE CAREFUL", risky: "HIGH RISK" };

export default async function Image({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const r = await cachedScan(address);
  const color = r.ok ? COLOR[r.report.grade] : "#8a8a85";
  const c = 2 * Math.PI * 150;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0a0b", color: "#ecebe6", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 630, display: "flex", background: `radial-gradient(circle at 78% 50%, ${color}22, transparent 55%)` }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, color: "#bdbcb6" }}>
            <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
              <circle cx="12" cy="16" r="8.5" stroke="#ecebe6" strokeOpacity="0.45" strokeWidth="2" />
              <circle cx="20" cy="16" r="8.5" stroke="#f5b84b" strokeWidth="2.4" />
              <circle cx="20" cy="16" r="2.6" fill="#f5b84b" />
            </svg>
            Second Look
          </div>
          {r.ok ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, color, letterSpacing: 4, fontWeight: 700, display: "flex" }}>{GRADE[r.report.grade]}</div>
              <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.05, marginTop: 8, display: "flex" }}>{`$${r.token.symbol.slice(0, 12)}`}</div>
              <div style={{ display: "flex", flexDirection: "column", marginTop: 24, gap: 8 }}>
                {r.report.summary.slice(0, 3).map((s) => (
                  <div key={s} style={{ fontSize: 30, color: "#d5d4ce", display: "flex" }}>
                    {(r.report.grade === "clean" ? "✓ " : "• ") + s}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 60, fontWeight: 800 }}>Take a second look before you ape.</div>
          )}
          <div style={{ fontSize: 24, color: "#8a8a85", display: "flex" }}>Token scanner for Robinhood Chain</div>
        </div>
        {r.ok && (
          <div style={{ width: 360, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <svg width="340" height="340" viewBox="0 0 340 340">
              <circle cx="170" cy="170" r="150" stroke="#ffffff18" strokeWidth="22" fill="none" />
              <circle cx="170" cy="170" r="150" stroke={color} strokeWidth="22" fill="none" strokeLinecap="round" strokeDasharray={`${(r.report.score / 100) * c} ${c}`} transform="rotate(-90 170 170)" />
            </svg>
            <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 132, fontWeight: 800, lineHeight: 1, display: "flex" }}>{r.report.score}</div>
              <div style={{ fontSize: 28, color: "#8a8a85", display: "flex" }}>/ 100</div>
            </div>
          </div>
        )}
      </div>
    ),
    size,
  );
}
