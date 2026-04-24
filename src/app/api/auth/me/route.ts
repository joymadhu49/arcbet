/**
 * GET /api/auth/me
 * Returns { address } of the currently signed-in admin, or { address: null } if not signed in.
 */
import { NextRequest } from "next/server";
import { SESSION_COOKIE, isAdminAddress, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session || !isAdminAddress(session.addr)) {
    return Response.json({ address: null });
  }
  return Response.json({ address: session.addr, exp: session.exp });
}
