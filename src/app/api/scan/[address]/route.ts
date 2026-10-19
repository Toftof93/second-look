import { cachedScan } from "@/lib/cached";

export async function GET(_: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const result = await cachedScan(address);
  return Response.json(result, { status: result.ok ? 200 : 400, headers: { "cache-control": "public, s-maxage=60" } });
}
