"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const isCA = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);

export function ScanForm({ initial = "", compact = false }: { initial?: string; compact?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (raw: string) => {
    // People paste whole posts ("CA: 0x…"); pull the address out.
    const ca = raw.match(/0x[0-9a-fA-F]{40}/)?.[0] ?? raw.trim();
    if (!isCA(ca)) return setError("Paste a token contract address (starts with 0x, 42 characters).");
    setError("");
    setBusy(true);
    router.push(`/t/${ca}`);
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setValue(text.trim());
      if (/0x[0-9a-fA-F]{40}/.test(text)) go(text);
    } catch {
      setError("Couldn't read your clipboard. Long-press the box and paste instead.");
    }
  };

  return (
    <form
      className={`scan ${compact ? "compact" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
    >
      <div className="scan-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a token CA (0x…)"
          spellCheck={false}
          autoComplete="off"
          inputMode="text"
          aria-label="Token contract address"
        />
        {!value && (
          <button type="button" className="paste" onClick={paste}>
            Paste
          </button>
        )}
        <button type="submit" className="go" disabled={busy}>
          {busy ? "Looking…" : "Take a second look"}
        </button>
      </div>
      {error && <p className="scan-err">{error}</p>}
    </form>
  );
}
