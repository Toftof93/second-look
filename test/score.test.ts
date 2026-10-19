import { test } from "node:test";
import assert from "node:assert/strict";
import { score, findPowers } from "../src/lib/score.ts";

const base = { name: "T", symbol: "T", verified: true, owner: "renounced" as const, holders: 500 };

test("clean token scores high", () => {
  const r = score({
    ...base,
    dev: { address: "0xd", holdsPct: 1, soldPct: 0, launches: 1, txCount: 80 },
    topHolders: [{ address: "0xa", pct: 70, isContract: true }, { address: "0xb", pct: 3, isContract: false }],
    snipe: { windowSec: 60, wallets: 3, boughtPct: 4 },
    createdAt: 0,
  }, 10 * 86400);
  assert.equal(r.grade, "clean");
  assert.ok(r.score >= 90, String(r.score));
});

test("rug signals stack up", () => {
  const r = score({
    ...base,
    owner: "0xowner",
    powers: ["mint", "blacklist"],
    dev: { address: "0xd", holdsPct: 30, soldPct: 60, launches: 14, txCount: 300 },
    topHolders: [{ address: "0xd", pct: 30, isContract: false }, { address: "0xe", pct: 25, isContract: false }],
    snipe: { windowSec: 60, wallets: 20, boughtPct: 45, stillHoldPct: 40 },
  });
  assert.equal(r.grade, "risky");
  assert.equal(r.score, 0);
  assert.equal(r.checks[0].level, "bad");
  assert.equal(r.summary.length, 3);
});

test("contracts are left out of whale risk", () => {
  const r = score({ ...base, topHolders: [{ address: "0xcurve", pct: 80, isContract: true }, { address: "0xb", pct: 2, isContract: false }] });
  assert.equal(r.checks.find((c) => c.id === "whales")?.level, "good");
});

test("missing data is unknown, lightly penalised, never fatal", () => {
  const r = score({ name: "T", symbol: "T" });
  assert.ok(r.checks.some((c) => c.level === "unknown"));
  assert.ok(r.score > 80);
});

test("findPowers reads risky admin functions only", () => {
  const abi = [
    { type: "function", name: "mint", stateMutability: "nonpayable" },
    { type: "function", name: "setBots", stateMutability: "nonpayable" },
    { type: "function", name: "setSellFee", stateMutability: "nonpayable" },
    { type: "function", name: "transfer", stateMutability: "nonpayable" },
    { type: "function", name: "isBot", stateMutability: "view" },
  ];
  assert.deepEqual(findPowers(abi).sort(), ["blacklist", "fees", "mint"]);
});
