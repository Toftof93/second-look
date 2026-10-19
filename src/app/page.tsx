import { ScanForm } from "@/components/ScanForm";
import { ScoreDial } from "@/components/ScoreDial";
import { score } from "@/lib/score";

const CHECKS = [
  { t: "Dev wallet", d: "How much the launcher holds, whether they've already sold, and how many tokens they've launched before." },
  { t: "Whales", d: "How much of the supply the top 10 wallets control, with the launch curve and pools left out." },
  { t: "Snipers", d: "Who bought in the first 60 seconds, how much they took and whether they're still holding." },
  { t: "Contract powers", d: "Mint, blacklist, pause, tax switches and upgradeable code. The ways a dev can rug without selling." },
  { t: "Verified code", d: "Whether anyone can actually read what the contract does." },
  { t: "Age & crowd", d: "How old the token is and how many people really hold it." },
];

const LABEL = { clean: "Looks clean", careful: "Be careful", risky: "High risk" };

// A made-up token, scored by the real engine, to show what a report looks like.
const example = score(
  {
    name: "Example",
    symbol: "EXAMPLE",
    holders: 142,
    verified: true,
    owner: "renounced",
    dev: { address: "0x0000000000000000000000000000000000000001", holdsPct: 18.4, soldPct: 0, launches: 6, txCount: 40 },
    topHolders: [
      { address: "0x1", pct: 18.4, isContract: false },
      { address: "0x2", pct: 9.1, isContract: false },
      { address: "0x3", pct: 6.2, isContract: false },
      { address: "0x4", pct: 4.0, isContract: false },
    ],
    snipe: { windowSec: 60, wallets: 9, boughtPct: 21, stillHoldPct: 17 },
  },
  0,
);

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <p className="kicker">Token scanner · Robinhood Chain</p>
        <h1>
          Take a <em>second look</em>
          <br />
          before you ape.
        </h1>
        <p className="lead">Paste any token’s CA. In seconds you’ll see who launched it, who’s holding it, who sniped it, and what the contract lets the dev do.</p>
        <ScanForm />
        <p className="fine">Free. No wallet needed.</p>
      </section>

      <section className="sample">
        <div className="sample-card">
          <span className="sample-tag">Example report</span>
          <ScoreDial score={example.score} grade={example.grade} size={132} />
          <div>
            <p className={`grade ${example.grade}`}>{LABEL[example.grade]}</p>
            <h3>$EXAMPLE</h3>
            <ul className="summary">
              {example.summary.map((s) => (
                <li key={s}>🚩 {s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="checks-grid">
        <p className="kicker">What we check</p>
        <h2>Six things the chart won’t tell you.</h2>
        <div className="cards">
          {CHECKS.map((c, i) => (
            <div key={c.t} className="card">
              <span className="num">0{i + 1}</span>
              <h3>{c.t}</h3>
              <p>{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="faq">
        <p className="kicker">Questions</p>
        <details>
          <summary>Where does the data come from?</summary>
          <p>Straight from Robinhood Chain: the official Blockscout explorer and the chain’s public RPC. Nothing is self-reported by the token.</p>
        </details>
        <details>
          <summary>Does a high score mean it’s safe?</summary>
          <p>No. A clean scan means nothing scary shows up on-chain right now. A dev can still walk away, and hype can still die. Size your trades accordingly.</p>
        </details>
        <details>
          <summary>Why are contracts left out of the whale count?</summary>
          <p>On launchpads like Pons, the bonding curve and the trading pool are contracts that hold most of the supply. They aren’t people who can dump on you.</p>
        </details>
        <details>
          <summary>Do I need to connect a wallet?</summary>
          <p>No. Second Look only reads public chain data. It never asks for your wallet, keys or seed phrase. If something claiming to be us does, it’s a scam.</p>
        </details>
      </section>
    </main>
  );
}
