import "server-only";
import { createPublicClient, http, isAddress, getAddress, parseAbi, parseAbiItem, type Address } from "viem";
import { apiUrl, CHAIN_ID, RPC_URL } from "./chain";
import { findPowers, score, type Facts, type Holder, type Report } from "./score";

export type TokenView = {
  address: Address;
  name: string;
  symbol: string;
  icon?: string;
  decimals: number;
  totalSupply: string;
  priceUsd?: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
  createdAt?: number;
  dev?: Address;
  holders?: number;
};

export type ScanResult =
  | { ok: true; token: TokenView; facts: Facts; report: Report; scannedAt: number }
  | { ok: false; error: string };

const client = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: "Robinhood Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_URL] } },
  },
  transport: http(RPC_URL, { timeout: 10_000, retryCount: 1 }),
});

/* eslint-disable @typescript-eslint/no-explicit-any */
async function api<T = any>(path: string, params?: Record<string, string | undefined>): Promise<T | undefined> {
  try {
    const res = await fetch(apiUrl(path, params), {
      headers: { accept: "application/json" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

const num = (v: unknown) => (v === null || v === undefined || v === "" ? undefined : Number(v));
const ts = (v: unknown) => (typeof v === "string" ? Math.floor(Date.parse(v) / 1000) : undefined);
const erc20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);
const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
const ZERO = "0x0000000000000000000000000000000000000000";

const share = (raw: bigint, supply: bigint) => (supply === 0n ? 0 : Number((raw * 1_000_000n) / supply) / 10_000);

export async function scanToken(input: string): Promise<ScanResult> {
  if (!isAddress(input.trim())) return { ok: false, error: "That doesn't look like a contract address (0x… 42 characters)." };
  const token = getAddress(input.trim());

  const [info, addr, contract, holdersPage] = await Promise.all([
    api(`/tokens/${token}`),
    api(`/addresses/${token}`),
    api(`/smart-contracts/${token}`),
    api(`/tokens/${token}/holders`),
  ]);

  // Fall back to the RPC if the explorer is down or hasn't indexed the token yet.
  let name: string | undefined = info?.name;
  let symbol: string | undefined = info?.symbol;
  let decimals = num(info?.decimals);
  let supply = info?.total_supply ? BigInt(info.total_supply) : undefined;
  if (!info) {
    const code = await client.getCode({ address: token }).catch(() => undefined);
    if (!code || code === "0x") return { ok: false, error: "No token at this address on Robinhood Chain." };
    const r = await client
      .multicall({
        allowFailure: true,
        contracts: (["name", "symbol", "decimals", "totalSupply"] as const).map((fn) => ({ address: token, abi: erc20, functionName: fn })),
      })
      .catch(() => undefined);
    // multicall needs Multicall3; fall back to single calls if the chain doesn't have it at the usual address
    const read = async (fn: "name" | "symbol" | "decimals" | "totalSupply", i: number) =>
      r?.[i]?.status === "success" ? r[i].result : await client.readContract({ address: token, abi: erc20, functionName: fn }).catch(() => undefined);
    name = (await read("name", 0)) as string | undefined;
    symbol = (await read("symbol", 1)) as string | undefined;
    decimals = Number((await read("decimals", 2)) ?? 18);
    supply = (await read("totalSupply", 3)) as bigint | undefined;
    if (supply === undefined) return { ok: false, error: "This address isn't an ERC-20 token." };
  }
  if (info && info.type && info.type !== "ERC-20") return { ok: false, error: `This is an ${info.type} token. Second Look scans ERC-20 tokens.` };
  supply ??= 0n;

  // Who launched it: the sender of the creation transaction (a launchpad factory deploys the contract itself).
  const creationTx: string | undefined = addr?.creation_transaction_hash ?? addr?.creation_tx_hash;
  const tx = creationTx ? await api(`/transactions/${creationTx}`) : undefined;
  const dev: Address | undefined = tx?.from?.hash ? getAddress(tx.from.hash) : addr?.creator_address_hash ? getAddress(addr.creator_address_hash) : undefined;
  const createdAt = ts(tx?.timestamp);
  const createdBlock = num(tx?.block_number ?? tx?.block);

  const facts: Facts = {
    name: name ?? "Unknown",
    symbol: symbol ?? "???",
    createdAt,
    holders: num(info?.holders_count ?? info?.holders),
    verified: contract ? Boolean(contract.is_verified || contract.is_fully_verified || contract.is_partially_verified) : addr ? Boolean(addr.is_verified) : undefined,
  };

  // Admin powers and ownership
  if (Array.isArray(contract?.abi)) facts.powers = findPowers(contract.abi);
  if (addr?.implementations?.length || contract?.proxy_type) facts.powers = [...new Set([...(facts.powers ?? []), "proxy"])];
  const owner = await client.readContract({ address: token, abi: erc20, functionName: "owner" }).catch(() => undefined);
  if (owner !== undefined) facts.owner = owner.toLowerCase() === ZERO || owner.toLowerCase() === "0x000000000000000000000000000000000000dead" ? "renounced" : owner;

  // Holders
  if (holdersPage?.items) {
    facts.topHolders = (holdersPage.items as any[]).slice(0, 25).map(
      (h): Holder => ({
        address: getAddress(h.address.hash),
        pct: share(BigInt(h.value), supply!),
        isContract: Boolean(h.address.is_contract),
        label: h.address.name ?? h.address.metadata?.tags?.[0]?.name ?? undefined,
        tag: dev && h.address.hash.toLowerCase() === dev.toLowerCase() ? "dev" : undefined,
      }),
    );
  }

  // Dev wallet
  if (dev) {
    const [bal, devTransfers, devTxs, devCounters] = await Promise.all([
      client.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [dev] }).catch(() => undefined),
      api(`/addresses/${dev}/token-transfers`, { type: "ERC-20", token }),
      api(`/addresses/${dev}/transactions`, { filter: "from" }),
      api(`/addresses/${dev}/counters`),
    ]);
    facts.dev = { address: dev, holdsPct: bal !== undefined ? share(bal, supply) : undefined, txCount: num(devCounters?.transactions_count) };

    if (devTransfers?.items) {
      let inn = 0n, out = 0n;
      for (const t of devTransfers.items as any[]) {
        const v = BigInt(t.total?.value ?? 0);
        if (t.to?.hash?.toLowerCase() === dev.toLowerCase()) inn += v;
        if (t.from?.hash?.toLowerCase() === dev.toLowerCase()) out += v;
      }
      if (inn > 0n) facts.dev.soldPct = Math.min(100, Number((out * 1000n) / inn) / 10);
    }

    // Count transactions from the dev that look like this launch (same target, same method).
    if (devTxs?.items && tx?.to?.hash) {
      const target = tx.to.hash.toLowerCase();
      const method = tx.method;
      facts.dev.launches = (devTxs.items as any[]).filter((t) => t.to?.hash?.toLowerCase() === target && (!method || t.method === method)).length;
    }
  }

  // Snipers: who received tokens in the first minute after launch
  if (createdBlock !== undefined && createdAt !== undefined) {
    facts.snipe = await snipers(token, BigInt(createdBlock), createdAt, supply, dev).catch(() => undefined);
  }

  const report = score(facts);
  return {
    ok: true,
    token: {
      address: token,
      name: facts.name,
      symbol: facts.symbol,
      icon: info?.icon_url ?? undefined,
      decimals: decimals ?? 18,
      totalSupply: supply.toString(),
      priceUsd: num(info?.exchange_rate),
      marketCapUsd: num(info?.circulating_market_cap) || undefined,
      volume24hUsd: num(info?.volume_24h) || undefined,
      createdAt,
      dev,
      holders: facts.holders,
    },
    facts,
    report,
    scannedAt: Math.floor(Date.now() / 1000),
  };
}

const WINDOW = 60; // seconds after launch that count as "sniping"

async function snipers(token: Address, fromBlock: bigint, createdAt: number, supply: bigint, dev?: Address) {
  const logs = await client.getLogs({ address: token, event: transferEvent, fromBlock, toBlock: fromBlock + 400n });
  if (!logs.length) return undefined;

  // Blocks on Robinhood Chain are produced on demand, so check real timestamps.
  const blocks = [...new Set(logs.map((l) => l.blockNumber!))].sort((a, b) => (a < b ? -1 : 1)).slice(0, 24);
  const times = await Promise.all(blocks.map((b) => client.getBlock({ blockNumber: b }).then((x) => Number(x.timestamp)).catch(() => undefined)));
  const inWindow = new Set(blocks.filter((_, i) => times[i] !== undefined && times[i]! - createdAt <= WINDOW));

  // Count what each wallet received and sent in the window. Net senders are the curve or pool handing out buys.
  const got = new Map<string, bigint>();
  const sent = new Map<string, bigint>();
  for (const l of logs) {
    if (!inWindow.has(l.blockNumber!)) continue;
    const { from, to, value } = l.args;
    if (!from || !to || value === undefined) continue;
    const f = from.toLowerCase(), t = to.toLowerCase();
    if (f !== ZERO) sent.set(f, (sent.get(f) ?? 0n) + value);
    if (f !== ZERO) got.set(t, (got.get(t) ?? 0n) + value); // skip the initial mint
  }
  for (const [a, v] of sent) if (v > (got.get(a) ?? 0n)) got.delete(a);
  for (const a of [ZERO, "0x000000000000000000000000000000000000dead", token.toLowerCase(), dev?.toLowerCase()]) if (a) got.delete(a);

  const buyers = [...got.entries()].sort((a, b) => (a[1] > b[1] ? -1 : 1));
  const total = buyers.reduce((s, [, v]) => s + v, 0n);
  const top = buyers.slice(0, 12);
  const held = await Promise.all(
    top.map(([a]) => client.readContract({ address: token, abi: erc20, functionName: "balanceOf", args: [a as Address] }).catch(() => undefined)),
  );
  const stillHold = held.every((x) => x !== undefined) ? held.reduce((s, v) => s + (v as bigint), 0n) : undefined;

  return {
    windowSec: WINDOW,
    wallets: buyers.length,
    boughtPct: share(total, supply),
    stillHoldPct: stillHold !== undefined ? share(stillHold, supply) : undefined,
  };
}
