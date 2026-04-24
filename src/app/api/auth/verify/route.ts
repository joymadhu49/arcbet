/**
 * POST /api/auth/verify
 * Body: { address, message, signature }
 * Verifies the signature, checks the address is the configured admin,
 * and sets an httpOnly session cookie.
 */
import { NextRequest } from "next/server";
import { verifyMessage } from "viem";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  extractNonce,
  isAdminAddress,
  signSession,
  verifyNonce,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<Response> {
  let body: { address?: string; message?: string; signature?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const address = (body.address ?? "").trim() as `0x${string}`;
  const message = body.message ?? "";
  const signature = (body.signature ?? "") as `0x${string}`;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return Response.json({ error: "bad address" }, { status: 400 });
  }
  if (!message || !signature) {
    return Response.json({ error: "message + signature required" }, { status: 400 });
  }

  // 1. Nonce must be fresh and HMAC-valid.
  const nonce = extractNonce(message);
  if (!nonce || !(await verifyNonce(nonce))) {
    return Response.json({ error: "invalid or expired nonce" }, { status: 401 });
  }

  // 2. Signature must recover to `address` (EIP-191 personal_sign or EIP-1271 contract).
  let ok = false;
  try {
    ok = await verifyMessage({ address, message, signature });
  } catch {
    ok = false;
  }
  if (!ok) {
    return Response.json({ error: "signature does not match address" }, { status: 401 });
  }

  // 3. Address must be the configured admin.
  if (!isAdminAddress(address)) {
    return Response.json({ error: "address is not the admin" }, { status: 403 });
  }

  // 4. Issue session cookie.
  const token = await signSession(address);
  const res = Response.json({ ok: true, address: address.toLowerCase() });
  res.headers.append(
    "Set-Cookie",
    [
      `${SESSION_COOKIE}=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${SESSION_TTL_SECONDS}`,
      process.env.NODE_ENV === "production" ? "Secure" : "",
    ]
      .filter(Boolean)
      .join("; "),
  );
  return res;
}
