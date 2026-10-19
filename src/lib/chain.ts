// Robinhood Chain mainnet. Every endpoint can be overridden with env vars on Vercel.
export const CHAIN_ID = 4663;
export const RPC_URL = process.env.RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
export const EXPLORER_URL = process.env.EXPLORER_URL || "https://robinhoodchain.blockscout.com";

// Optional Blockscout PRO key (free at dev.blockscout.com). Without it we use the explorer's public API.
const PRO_KEY = process.env.BLOCKSCOUT_API_KEY;

export function apiUrl(path: string, params: Record<string, string | undefined> = {}) {
  const base = PRO_KEY ? `https://api.blockscout.com/${CHAIN_ID}/api/v2` : `${EXPLORER_URL}/api/v2`;
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
  if (PRO_KEY) url.searchParams.set("apikey", PRO_KEY);
  return url.toString();
}

export const explorerLink = (kind: "token" | "address" | "tx", id: string) => `${EXPLORER_URL}/${kind}/${id}`;
