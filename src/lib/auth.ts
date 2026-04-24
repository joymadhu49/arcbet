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
 *
 * All crypto uses the Web Crypto API so the same code runs in the Edge runtime
 * (Next.js middleware) AND the Node runtime (API routes).
 */

/** 4 hours. Long enough to avoid mid-session signouts, short enough to limit exposure. */
export const SESSION_TTL_SECONDS = 4 * 60 * 60;

/** 5 minutes. Nonces older than this are rejected. */
export const NONCE_TTL_SECONDS = 5 * 60;

/** Name of the httpOnly session cookie. */
export const SESSION_COOKIE = "propex_admin";

function secretString(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ADMIN_SESSION_SECRET missing or too short (need 16+ chars). Set it in your environment.",
    );
  }
  return s;
}

/** Encode bytes as base64url. Works in Edge + Node. */
function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  // btoa is available in both Edge runtime and modern Node.
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecodeToString(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(padded);
  return bin;
}

/**
 * Encode string → ArrayBuffer. We use ArrayBuffer (not Uint8Array) because the
 * Web Crypto types in @types/node 20 reject Uint8Array<ArrayBufferLike> for
 * BufferSource in strict mode.
 */
function utf8Encode(s: string): ArrayBuffer {
  const view = new TextEncoder().encode(s);
  // Copy into a fresh ArrayBuffer to guarantee the exact `ArrayBuffer` type
  // (not SharedArrayBuffer) that Web Crypto's BufferSource expects.
  const ab = new ArrayBuffer(view.byteLength);
  new Uint8Array(ab).set(view);
  return ab;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    utf8Encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmac(payload: string): Promise<string> {
  const key = await importHmacKey(secretString());
  const sig = await crypto.subtle.sign("HMAC", key, utf8Encode(payload));
  return b64urlEncode(sig);
}

/** Constant-time equality (prevents HMAC timing side channel). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Crypto-strong random hex using Web Crypto. */
function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  let out = "";
  for (let i = 0; i < a.length; i++) out += a[i].toString(16).padStart(2, "0");
  return out;
}

// ── Nonces ─────────────────────────────────────────────

/** Create an HMAC-bound nonce carrying its own timestamp. */
export async function createNonce(): Promise<{ nonce: string; issuedAt: number }> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const rand = randomHex(12);
  const payload = `${rand}.${issuedAt}`;
  const sig = await hmac(payload);
  return { nonce: `${payload}.${sig}`, issuedAt };
}

export async function verifyNonce(nonce: string): Promise<boolean> {
  const parts = nonce.split(".");
  if (parts.length !== 3) return false;
  const [rand, tsStr, sig] = parts;
  const expected = await hmac(`${rand}.${tsStr}`);
  if (!safeEqual(expected, sig)) return false;
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
export async function signSession(addr: `0x${string}`): Promise<string> {
  const payload: SessionPayload = {
    addr: addr.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64urlEncode(utf8Encode(JSON.stringify(payload)));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

/** Verify + decode a session token. Returns null on any failure. */
export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = await hmac(body);
  if (!safeEqual(expected, sig)) return null;
  try {
    const parsed = JSON.parse(b64urlDecodeToString(body)) as SessionPayload;
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
