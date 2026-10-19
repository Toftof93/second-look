import { Mark } from "@/components/Mark";

const STEPS = ["Finding the dev wallet", "Counting the whales", "Checking for snipers", "Reading the contract"];

export default function Loading() {
  return (
    <main className="wrap">
      <div className="looking">
        <div className="looking-mark">
          <Mark size={72} />
        </div>
        <p className="grade">Taking a second look…</p>
        <ul>
          {STEPS.map((s, i) => (
            <li key={s} style={{ animationDelay: `${i * 0.7}s` }}>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
