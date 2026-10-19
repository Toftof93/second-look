export function ScoreDial({ score, grade, size = 168 }: { score: number; grade: "clean" | "careful" | "risky"; size?: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  return (
    <div className={`dial ${grade}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden>
        <circle cx="80" cy="80" r={r} className="dial-track" />
        <circle
          cx="80"
          cy="80"
          r={r}
          className="dial-arc"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          transform="rotate(-90 80 80)"
        />
      </svg>
      <div className="dial-num">
        <b>{score}</b>
        <span>/ 100</span>
      </div>
    </div>
  );
}
