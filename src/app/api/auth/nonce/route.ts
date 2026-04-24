/**
 * GET /api/auth/nonce
 * Returns { nonce, message } for the wallet to sign.
 */
import { NextRequest } from "next/server";
import { arcTestnet } from "@/lib/chains";
import { buildSignInMessage, createNonce } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  let body: { address?: string } = {};
  try {
    body = (await req.json()) as { address?: string };
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const addr = (body.address ?? "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    return Response.json({ error: "address required" }, { status: 400 });
  }

  const { nonce } = await createNonce();
  const host = req.headers.get("host") ?? "localhost:3000";
  const message = buildSignInMessage({
    domain: host,
    address: addr as `0x${string}`,
    nonce,
    chainId: arcTestnet.id,
  });

  return Response.json({ nonce, message });
}
