import { explorerLink } from "@/lib/chain";
import { ago, type Check, type Report as R } from "@/lib/score";
import type { TokenView } from "@/lib/scan";
import type { Facts } from "@/lib/score";
import { SITE_URL } from "@/lib/social";
import { CopyButton } from "./CopyButton";
import { ScoreDial } from "./ScoreDial";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const usd = (n?: number) =>
  n === undefined ? undefined : n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : n >= 1 ? `$${n.toFixed(2)}` : `$${n.toPrecision(3)}`;
const ICON: Record<Check["level"], string> = { bad: "🚩", warn: "⚠️", good: "✓", info: "•", unknown: "?" };
const GRADE = { clean: "Looks clean", careful: "Be careful", risky: "High risk" };

export function Report({ token, facts, report, scannedAt }: { token: TokenView; facts: Facts; report: R; scannedAt: number }) {
  const shareText =
    `Took a second look at $${token.symbol}: ${report.score}/100, ${GRADE[report.grade].toLowerCase()} ${report.grade === "clean" ? "✅" : "🚩"}\n\n` +
    report.summary.map((s) => `• ${s}`).join("\n") +
    `\n\nCheck any token before you ape 👀`;
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${SITE_URL}/t/${token.address}`)}`;
  const holders = facts.topHolders?.slice(0, 10) ?? [];
  const max = Math.max(1, ...holders.map((h) => h.pct));

  return (
    <div className="report">
      <header className="token-head">
        <div className="token-id">
          {token.icon ? <img src={token.icon} alt="" className="token-icon" /> : <div className="token-icon blank">{token.symbol.slice(0, 1)}</div>}
          <div>
            <h1>
              {token.name} <span className="sym">${token.symbol}</span>
            </h1>
            <div className="ca">
              <code>{short(token.address)}</code>
              <CopyButton text={token.address} label="Copy CA" />
              <a className="chip-btn" href={explorerLink("token", token.address)} target="_blank" rel="noreferrer">
                Explorer ↗
              </a>
            </div>
          </div>
        </div>
        <dl className="stats">
          {token.priceUsd !== undefined && <Stat k="Price" v={usd(token.priceUsd)!} />}
          {token.marketCapUsd !== undefined && <Stat k="Market cap" v={usd(token.marketCapUsd)!} />}
          {token.holders !== undefined && <Stat k="Holders" v={token.holders.toLocaleString("en-US")} />}
          {token.createdAt !== undefined && <Stat k="Age" v={ago(scannedAt - token.createdAt)} />}
        </dl>
      </header>

      <section className={`verdict ${report.grade}`}>
        <ScoreDial score={report.score} grade={report.grade} />
        <div className="verdict-text">
          <p className="grade">{GRADE[report.grade]}</p>
          <h2>{report.verdict}</h2>
          <ul className="summary">
            {report.summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <a className="btn-x" href={shareUrl} target="_blank" rel="noreferrer">
            Share on X
          </a>
        </div>
      </section>

      <section className="panel">
        <h3>What we found</h3>
        <ul className="checks">
          {report.checks.map((c) => (
            <li key={c.id} className={c.level}>
              <span className="ico">{ICON[c.level]}</span>
              <div>
                <b>{c.title}</b>
                <p>{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {holders.length > 0 && (
        <section className="panel">
          <h3>Top holders</h3>
          <ol className="holders">
            {holders.map((h, i) => (
              <li key={h.address}>
                <span className="rank">{i + 1}</span>
                <a href={explorerLink("address", h.address)} target="_blank" rel="noreferrer" className="who">
                  <span>{h.label ? h.label : short(h.address)}</span>
                  {h.tag === "dev" && <em className="tag dev">Dev</em>}
                  {h.isContract && <em className="tag">Contract</em>}
                </a>
                <span className="bar">
                  <i style={{ width: `${(h.pct / max) * 100}%` }} className={h.isContract ? "c" : h.pct >= 10 ? "hot" : ""} />
                </span>
                <span className="pct">{h.pct.toFixed(2)}%</span>
              </li>
            ))}
          </ol>
          <p className="fine">Contracts are usually the launch curve, the trading pool or a locker, so they don't count toward whale risk.</p>
        </section>
      )}

      {facts.dev && (
        <section className="panel">
          <h3>Dev wallet</h3>
          <div className="dev">
            <a href={explorerLink("address", facts.dev.address)} target="_blank" rel="noreferrer">
              <code>{short(facts.dev.address)}</code>
            </a>
            <CopyButton text={facts.dev.address} label="Copy" />
          </div>
          <dl className="stats small">
            {facts.dev.holdsPct !== undefined && <Stat k="Holds" v={`${facts.dev.holdsPct.toFixed(2)}%`} />}
            {facts.dev.soldPct !== undefined && <Stat k="Sold / moved" v={`${facts.dev.soldPct.toFixed(0)}%`} />}
            {facts.dev.launches !== undefined && <Stat k="Recent launches" v={String(facts.dev.launches)} />}
            {facts.dev.txCount !== undefined && <Stat k="Wallet txs" v={facts.dev.txCount.toLocaleString("en-US")} />}
          </dl>
        </section>
      )}

      <p className="fine center">
        Scanned {new Date(scannedAt * 1000).toUTCString().slice(5, 22)} UTC from Robinhood Chain data. A score is a second look, not a
        guarantee. Not financial advice.
      </p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
