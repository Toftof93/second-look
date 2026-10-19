// Turns raw on-chain facts into a 0–100 score, a verdict and plain-English checks.
// Pure and dependency-free so it can be unit tested without the network.

export type Level = "good" | "warn" | "bad" | "info" | "unknown";

export type Holder = {
  address: string;
  pct: number; // share of total supply, 0–100
  isContract: boolean;
  label?: string;
  tag?: "dev" | "early";
};

export type Facts = {
  name: string;
  symbol: string;
  createdAt?: number; // unix seconds
  holders?: number;
  verified?: boolean;
  /** Owner/admin address, "renounced" if zero, undefined if the token has no owner() */
  owner?: string | "renounced" | null;
  /** Risky admin functions found in the verified ABI */
  powers?: string[];
  topHolders?: Holder[];
  dev?: {
    address: string;
    holdsPct?: number;
    soldPct?: number; // share of what the dev received that has left the wallet
    launches?: number; // similar launch transactions seen in the dev's recent history
    txCount?: number;
  };
  snipe?: {
    windowSec: number;
    wallets: number;
    boughtPct: number; // of total supply, excluding the dev
    stillHoldPct?: number; // of total supply, what those wallets still hold
  };
};

export type Check = { id: string; level: Level; title: string; detail: string };

export type Report = {
  score: number;
  grade: "clean" | "careful" | "risky";
  verdict: string;
  summary: string[];
  checks: Check[];
};

const pct = (n: number) => (n >= 10 ? n.toFixed(0) : n.toFixed(1)) + "%";

const POWER_COST: Record<string, number> = { mint: 20, blacklist: 15, fees: 12, pause: 12, limits: 6, proxy: 12 };

export function score(f: Facts, now = Date.now() / 1000): Report {
  const checks: Check[] = [];
  let penalty = 0;
  const add = (c: Check, cost = 0) => {
    checks.push(c);
    penalty += cost;
  };

  // 1. Dev wallet
  const d = f.dev;
  if (!d) {
    add({ id: "dev", level: "unknown", title: "Dev wallet", detail: "Couldn't find who launched this token." });
  } else {
    const h = d.holdsPct;
    if (h === undefined) add({ id: "dev", level: "unknown", title: "Dev holdings", detail: "Couldn't read the dev's balance." });
    else if (h >= 15) add({ id: "dev", level: "bad", title: `Dev holds ${pct(h)}`, detail: "One dump from the dev can crash the price." }, 25);
    else if (h >= 5) add({ id: "dev", level: "warn", title: `Dev holds ${pct(h)}`, detail: "A sizeable bag. Watch the dev wallet." }, 10);
    else add({ id: "dev", level: "good", title: h < 0.05 ? "Dev holds nothing" : `Dev holds ${pct(h)}`, detail: "The dev can't move the price much on their own." });

    if (d.soldPct !== undefined && d.soldPct >= 50)
      add({ id: "dev-sold", level: "bad", title: `Dev already sold or moved ${pct(d.soldPct)}`, detail: "The person who launched it is cashing out." }, 20);
    else if (d.soldPct !== undefined && d.soldPct >= 15)
      add({ id: "dev-sold", level: "warn", title: `Dev sold or moved ${pct(d.soldPct)}`, detail: "Some of the dev's bag has already left the wallet." }, 8);

    if (d.launches !== undefined && d.launches >= 10)
      add({ id: "serial", level: "bad", title: `Serial launcher: ${d.launches}+ launches`, detail: "This wallet launches tokens over and over. Most of them die." }, 20);
    else if (d.launches !== undefined && d.launches >= 3)
      add({ id: "serial", level: "warn", title: `Dev launched ${d.launches} tokens recently`, detail: "Check how their other launches went." }, 8);
    else if (d.txCount !== undefined && d.txCount < 5)
      add({ id: "fresh", level: "warn", title: "Fresh dev wallet", detail: `Only ${d.txCount} transaction${d.txCount === 1 ? "" : "s"} ever. Hard to judge who's behind it.` }, 5);
  }

  // 2. Whales (wallets, not contracts like the curve, pool or lockers)
  const wallets = (f.topHolders ?? []).filter((x) => !x.isContract);
  if (!f.topHolders) {
    add({ id: "whales", level: "unknown", title: "Top holders", detail: "Couldn't load the holder list." });
  } else {
    const top10 = wallets.slice(0, 10).reduce((s, x) => s + x.pct, 0);
    const biggest = wallets[0]?.pct ?? 0;
    if (top10 >= 50 || biggest >= 20)
      add({ id: "whales", level: "bad", title: `Top 10 wallets hold ${pct(top10)}`, detail: `Supply is concentrated. The biggest wallet has ${pct(biggest)}.` }, 20);
    else if (top10 >= 30 || biggest >= 10)
      add({ id: "whales", level: "warn", title: `Top 10 wallets hold ${pct(top10)}`, detail: `A few wallets could move the price. Biggest: ${pct(biggest)}.` }, 8);
    else add({ id: "whales", level: "good", title: `Top 10 wallets hold ${pct(top10)}`, detail: "Supply is spread out." });
  }

  // 3. Snipers
  const s = f.snipe;
  if (s) {
    const still = s.stillHoldPct !== undefined ? ` They still hold ${pct(s.stillHoldPct)}.` : "";
    if (s.boughtPct >= 30)
      add({ id: "snipe", level: "bad", title: `Snipers took ${pct(s.boughtPct)} at launch`, detail: `${s.wallets} wallets bought in the first ${s.windowSec}s.${still}` }, (s.stillHoldPct ?? s.boughtPct) >= 15 ? 18 : 8);
    else if (s.boughtPct >= 12)
      add({ id: "snipe", level: "warn", title: `Snipers took ${pct(s.boughtPct)} at launch`, detail: `${s.wallets} wallets bought in the first ${s.windowSec}s.${still}` }, 6);
    else add({ id: "snipe", level: "good", title: "No heavy sniping", detail: `${s.wallets} wallet${s.wallets === 1 ? "" : "s"} bought ${pct(s.boughtPct)} in the first ${s.windowSec}s.` });
  }

  // 4. Contract
  if (f.verified === false)
    add({ id: "verified", level: "warn", title: "Code isn't verified", detail: "Nobody can read what this contract actually does." }, 12);
  else if (f.verified) add({ id: "verified", level: "good", title: "Code is verified", detail: "The contract source is public on the explorer." });

  const powers = f.powers ?? [];
  const ownerLive = typeof f.owner === "string" && f.owner !== "renounced";
  if (powers.length && f.owner !== "renounced") {
    const names = powers.map((p) => POWER_NAMES[p] ?? p).join(", ");
    const cost = Math.min(35, powers.reduce((t, p) => t + (POWER_COST[p] ?? 8), 0));
    add({ id: "powers", level: "bad", title: "Dev has special powers", detail: `The contract has ${names}.` }, cost);
  } else if (ownerLive) {
    add({ id: "owner", level: "info", title: "Has an owner", detail: "Someone still controls admin settings on this contract." }, 3);
  } else if (f.owner === "renounced") {
    add({ id: "owner", level: "good", title: "Ownership renounced", detail: "No one can change the rules anymore." });
  } else if (f.verified) {
    add({ id: "owner", level: "good", title: "No admin controls", detail: "No mint, blacklist, pause or tax switches found." });
  }

  // 5. Holders and age
  if (f.holders !== undefined) {
    if (f.holders < 25) add({ id: "holders", level: "warn", title: `Only ${f.holders} holders`, detail: "Very early or very thin. Easy to move." }, 6);
    else add({ id: "holders", level: "info", title: `${f.holders.toLocaleString("en-US")} holders`, detail: f.holders < 200 ? "Still a small crowd." : "A real crowd is holding it." });
  }
  if (f.createdAt) {
    const age = now - f.createdAt;
    if (age < 3600) add({ id: "age", level: "warn", title: `Launched ${ago(age)} ago`, detail: "Brand new. Most rugs happen in the first hours." }, 5);
    else add({ id: "age", level: "info", title: `Launched ${ago(age)} ago`, detail: age < 86400 ? "Less than a day old." : "Has survived past day one." });
  }

  const unknowns = checks.filter((c) => c.level === "unknown").length;
  const scoreVal = Math.max(0, Math.min(100, Math.round(100 - penalty - unknowns * 4)));
  const grade = scoreVal >= 75 ? "clean" : scoreVal >= 50 ? "careful" : "risky";
  const order: Record<Level, number> = { bad: 0, warn: 1, unknown: 2, info: 3, good: 4 };
  checks.sort((a, b) => order[a.level] - order[b.level]);

  const reds = checks.filter((c) => c.level === "bad");
  const verdict =
    grade === "clean" ? "Nothing scary on-chain." : grade === "careful" ? "Some red flags. Size small." : "High risk. Think twice.";
  const summary = [...reds, ...checks.filter((c) => c.level === "warn")].slice(0, 3).map((c) => c.title);
  if (!summary.length) summary.push(...checks.filter((c) => c.level === "good").slice(0, 3).map((c) => c.title));

  return { score: scoreVal, grade, verdict, summary, checks };
}

export const POWER_NAMES: Record<string, string> = {
  mint: "a mint switch (can print more tokens)",
  blacklist: "a blacklist (can block wallets from selling)",
  fees: "adjustable taxes",
  pause: "a pause switch (can freeze trading)",
  limits: "adjustable wallet/tx limits",
  proxy: "an upgradeable proxy (code can be swapped)",
};

/** Map a verified ABI's function names to risky admin powers. */
export function findPowers(abi: { type?: string; name?: string; stateMutability?: string }[]): string[] {
  const found = new Set<string>();
  for (const item of abi) {
    if (item.type !== "function" || !item.name || item.stateMutability === "view" || item.stateMutability === "pure") continue;
    const n = item.name.toLowerCase();
    if (/^(mint|_mint|mintto|minttokens)$/.test(n)) found.add("mint");
    else if (/(blacklist|blocklist|addbot|setbot|blockaddress|isbot|bots)/.test(n)) found.add("blacklist");
    else if (/(settax|setfee|updatefee|setbuyfee|setsellfee|updatetax|setbuytax|setselltax|setfees|settaxes)/.test(n)) found.add("fees");
    else if (/^(pause|settradingenabled|disabletrading|settrading)$/.test(n)) found.add("pause");
    else if (/(setmaxtx|setmaxwallet|updatemaxtx|updatemaxwallet|setmaxtransaction)/.test(n)) found.add("limits");
    else if (/^(upgradeto|upgradetoandcall)$/.test(n)) found.add("proxy");
  }
  return [...found];
}

export function ago(sec: number) {
  if (sec < 90) return `${Math.max(1, Math.round(sec))}s`;
  if (sec < 5400) return `${Math.round(sec / 60)}m`;
  if (sec < 172800) return `${Math.round(sec / 3600)}h`;
  return `${Math.round(sec / 86400)}d`;
}
