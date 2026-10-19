import type { Metadata } from "next";
import { cachedScan } from "@/lib/cached";
import { Report } from "@/components/Report";
import { ScanForm } from "@/components/ScanForm";

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const r = await cachedScan(address);
  if (!r.ok) return { title: "Scan · Second Look" };
  const title = `$${r.token.symbol}: ${r.report.score}/100 · Second Look`;
  const description = `${r.report.verdict} ${r.report.summary.join(". ")}.`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary_large_image", title, description } };
}

export default async function TokenPage({ params }: Props) {
  const { address } = await params;
  const r = await cachedScan(address);
  return (
    <main className="wrap">
      <ScanForm compact />
      {r.ok ? (
        <Report token={r.token} facts={r.facts} report={r.report} scannedAt={r.scannedAt} />
      ) : (
        <div className="panel error-box">
          <h2>Couldn’t scan that.</h2>
          <p>{r.error}</p>
        </div>
      )}
    </main>
  );
}
