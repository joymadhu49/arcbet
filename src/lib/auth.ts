/**
 * Lightweight SIWE-style admin auth.
 *
 * Flow:
 *  1. Client requests a nonce — server returns {nonce, message}. The nonce is an
 *     HMAC over (random || timestamp) so the server doesn't need to store it.
 *  2. Client asks the wallet to sign `message`, posts {address, signature, message}
 *     back to /api/auth/verify.
 *  3. Server verifies the signature, checks `address === ADMIN_ADDRESS`, issues an
 *     HMAC-signed session cookie {addr, exp}.
 *  4. Middleware gates /admin and /api/ai-market by checking that cookie.
 *
 * The only secret is ADMIN_SESSION_SECRET (server-only). Losing it only invalidates
 * existing sessions — users just re-sign-in.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** 4 hours. Long enough to avoid mid-session signouts, short enough to limit exposure. */
export const SESSION_TTL_SECONDS = 4 * 60 * 60;

/** 5 minutes. Nonces older than this are rejected. */
export const NONCE_TTL_SECONDS = 5 * 60;

/** Name of the httpOnly session cookie. */
export const SESSION_COOKIE = "propex_admin";

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET missing or too short (need 16+ chars). Set it in .env.local.",
    );
  }
  return s;
}

function b64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function hmac(payload: string): string {
  return b64urlEncode(createHmac("sha256", secret()).update(payload).digest());
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// ── Nonces ─────────────────────────────────────────────

/** Create an HMAC-bound nonce carrying its own timestamp. */
export function createNonce(): { nonce: string; issuedAt: number } {
  const issuedAt = Math.floor(Date.now() / 1000);
  const rand = randomBytes(12).toString("hex");
  const payload = `${rand}.${issuedAt}`;
  const sig = hmac(payload);
  return { nonce: `${payload}.${sig}`, issuedAt };
}

export function verifyNonce(nonce: string): boolean {
  const parts = nonce.split(".");
  if (parts.length !== 3) return false;
  const [rand, tsStr, sig] = parts;
  if (!safeEqual(hmac(`${rand}.${tsStr}`), sig)) return false;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  return now - ts <= NONCE_TTL_SECONDS;
}

// ── Sign-in message ────────────────────────────────────

/** Build the canonical message the wallet signs. */
export function buildSignInMessage(opts: {
  domain: string;
  address: `0x${string}`;
  nonce: string;
  chainId: number;
}): string {
  const iso = new Date().toISOString();
  return [
    `${opts.domain} wants you to sign in as the Propex admin:`,
    opts.address,
    ``,
    `URI: https://${opts.domain}`,
    `Version: 1`,
    `Chain ID: ${opts.chainId}`,
    `Nonce: ${opts.nonce}`,
    `Issued At: ${iso}`,
  ].join("\n");
}

export function extractNonce(message: string): string | null {
  const line = message.split("\n").find((l) => l.startsWith("Nonce: "));
  return line ? line.slice("Nonce: ".length).trim() : null;
}

// ── Session cookie ─────────────────────────────────────

export interface SessionPayload {
  addr: string;  // lower-case 0x address
  exp: number;   // unix seconds
}

/** Issue a new signed session token. */
export function signSession(addr: `0x${string}`): string {
  const payload: SessionPayload = {
    addr: addr.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = hmac(body);
  return `${body}.${sig}`;
}

/** Verify + decode a session token. Returns null on any failure. */
export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!safeEqual(hmac(body), sig)) return null;
  try {
    const parsed = JSON.parse(b64urlDecode(body).toString("utf8")) as SessionPayload;
    if (!parsed.addr || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check an address against the admin allowlist.  Exported so both API routes and
 * middleware use the exact same comparison.
 */
export function isAdminAddress(addr: string | undefined | null): boolean {
  if (!addr) return false;
  const admin = (process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? "").toLowerCase();
  if (!admin) return false;
  return addr.toLowerCase() === admin;
}
