# Second Look

**Take a second look before you ape.** A token scanner for Robinhood Chain.

Paste any token contract address and get a 0–100 score with plain-English red flags:

| Check | What it looks at |
|---|---|
| Dev wallet | Who launched it (sender of the creation tx), how much they hold, how much they've sold or moved, how many similar launches they've done, wallet age |
| Whales | Top 10 wallet share of supply. Contracts (launch curve, pools, lockers) are left out |
| Snipers | Wallets that received tokens in the first 60s after launch, their share, and what they still hold |
| Contract powers | Mint, blacklist, pause, tax and limit switches in the verified ABI, upgradeable proxies, ownership |
| Verified code | Whether the source is published on the explorer |
| Age & crowd | Token age and holder count |

Every report has a share link (`/t/<address>`) with its own preview image for X.

## Data

- [Blockscout](https://robinhoodchain.blockscout.com) explorer API (`/api/v2`) for token info, holders, transfers and contract source
- The Robinhood Chain public RPC for balances, `owner()` and launch-window Transfer logs

Everything runs server-side, so there are no CORS issues and no wallet is ever needed. Scans are cached for 60 seconds.

Optional environment variables (set them in Vercel → Settings → Environment Variables):

| Variable | Default |
|---|---|
| `RPC_URL` | `https://rpc.mainnet.chain.robinhood.com` |
| `EXPLORER_URL` | `https://robinhoodchain.blockscout.com` |
| `BLOCKSCOUT_API_KEY` | none. With a free key from dev.blockscout.com, requests go through the Blockscout PRO API for higher limits |
| `NEXT_PUBLIC_SITE_URL` | `https://second-look.vercel.app`, used for share links |

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # scoring engine tests
```

The score lives in `src/lib/score.ts` (pure, tested). Data gathering lives in `src/lib/scan.ts`.

A score is a second look, not a guarantee. Not financial advice.
