/**
 * Shared types + prompt helpers for the AI market creator.
 *
 * Imported by both the server route (`/api/ai-market`) and the client
 * component (`AiMarketCreator`) so the schema lives in one place.
 */

import type { CoinId, PriceMap } from "./coingecko";

/** Categories the AI is allowed to pick from (strip "All"). */
export const AI_CATEGORIES = [
  "Crypto",
  "Sports",
  "Politics",
  "Tech",
  "Entertainment",
] as const;
export type AiCategory = (typeof AI_CATEGORIES)[number];

/** The strict JSON shape we expect back from the AI. */
export interface AiMarketProposal {
  question: string;           // <=140 chars, ends with "?"
  description: string;        // 2-4 sentences, resolution criteria
  category: AiCategory;
  imageUrl: string;           // CoinGecko asset URL for crypto, else ""
  resolutionDays: number;     // 1-30
  crypto?: {
    coin: CoinId;
    startUsd: number;
    targetUsd: number;
  };
}

/** Request body the client POSTs to /api/ai-market. */
export interface AiMarketRequest {
  instruction: string;
  coinPrices: PriceMap | null;
  /** Recent existing market questions (open + resolved) — AI must avoid duplicates and similar phrasing. */
  existingQuestions?: string[];
}

/** Response body from /api/ai-market. */
export interface AiMarketResponse {
  proposal?: AiMarketProposal;
  error?: string;
}

/** Style hints rotated per call to nudge wording diversity. */
const STYLE_HINTS = [
  "punchy and direct",
  "neutral and analytical",
  "curious and speculative",
  "concrete and metric-driven",
  "tight and headline-style",
  "investigative and specific",
  "playful but precise",
  "data-forward and minimal",
] as const;

/** Phrasing-opener variants to actively rotate (avoid every question starting with 'Will'). */
const OPENER_HINTS = [
  "vary the opener — try forms like 'Does …', 'Can …', 'By <date>, will …', 'Is … going to …', not just 'Will …'",
  "lead with a noun or subject ('SOL above $280 by Friday?') rather than 'Will'",
  "start with a time clause ('By end of week, …') for at least this proposal",
  "phrase as a milestone check ('Hits $150k before …?')",
  "open with the actor/entity, not the auxiliary verb",
] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Build the system prompt. `nowIso` is injected server-side each call. */
export function buildSystemPrompt(
  nowIso: string,
  coinPrices: PriceMap | null,
  existingQuestions: string[] = [],
): string {
  const priceLines = coinPrices
    ? Object.entries(coinPrices)
        .map(([id, p]) => `- ${id}: $${p?.usd ?? "?"}`)
        .join("\n")
    : "- (no live prices available)";

  const avoidBlock =
    existingQuestions.length > 0
      ? existingQuestions
          .slice(0, 40)
          .map((q) => `- ${q}`)
          .join("\n")
      : "- (no prior markets)";

  const style = pick(STYLE_HINTS);
  const opener = pick(OPENER_HINTS);
  const nonce = Math.random().toString(36).slice(2, 8);

  return `You are Propex's market-proposal engine. Given a free-form admin instruction,
you produce a JSON object describing a binary (YES/NO) prediction market.

CURRENT DATE (UTC): ${nowIso}
DIVERSITY NONCE: ${nonce}
STYLE FOR THIS CALL: ${style}
OPENER GUIDANCE FOR THIS CALL: ${opener}

TRACKED CRYPTO COINS (id -> live USD spot):
${priceLines}

EXISTING MARKETS — DO NOT DUPLICATE OR PARAPHRASE THESE:
${avoidBlock}

Valid category values: "Crypto" | "Sports" | "Politics" | "Tech" | "Entertainment".

JSON SCHEMA (return EXACTLY this shape, no extra keys, no markdown, no prose):
{
  "question": string,            // <=140 chars, MUST end with "?"
  "description": string,         // 2-4 sentences explaining objective resolution criteria
  "category": "Crypto"|"Sports"|"Politics"|"Tech"|"Entertainment",
  "imageUrl": string,            // CoinGecko asset URL for crypto markets, else ""
  "resolutionDays": number,      // integer 1..30 (days from now until resolution)
  "crypto": {                    // ONLY if category === "Crypto" AND instruction references a tracked coin above
    "coin": "bitcoin"|"ethereum"|"solana"|"ripple"|"binancecoin",
    "startUsd": number,          // MUST equal the live spot from the table above
    "targetUsd": number          // sensible target relative to startUsd (up-bet or down-bet)
  }
}

RULES:
- Output PURE JSON. No backticks, no markdown, no commentary.
- UNIQUENESS: the "question" MUST be substantively different from every entry in the EXISTING MARKETS list above — different subject, threshold, timeframe, or framing. Do NOT paraphrase an existing market.
- VARIETY: rotate phrasing across calls. Do not default to "Will X close above Y by Z?" every time. Use the OPENER GUIDANCE and STYLE for this call.
- If the instruction is vague, still return a valid proposal but MAKE the resolution criteria tight and objective (e.g. "according to CoinGecko spot price on <ISO date>"). Pick a fresh subject the admin has not already covered (see EXISTING MARKETS).
- If the instruction mentions a coin not in the tracked list, still pick category="Crypto" but omit the "crypto" key and write the resolution source explicitly into "description".
- resolutionDays: map phrases like "today"->1, "this week"->7, "this month"->30. Default to 7 if unclear.
- For crypto targets, infer direction from the instruction ("hits", "above", "over" -> target > start; "below", "under", "drops to" -> target < start). If no direction given, assume +2% above start.
- Never invent dates in the past. Resolution is always in the future.
- imageUrl for crypto should be the CoinGecko logo: https://assets.coingecko.com/coins/images/<n>/large/<name>.png — use "" if you are not certain of the exact URL; the server will populate it.
`;
}

/** The 5 CoinGecko coin IDs we support in the `crypto` block. */
export const TRACKED_COIN_IDS: readonly CoinId[] = [
  "bitcoin",
  "ethereum",
  "solana",
  "ripple",
  "binancecoin",
] as const;

/** Narrow/validate an arbitrary parsed object into an `AiMarketProposal`. */
export function validateProposal(raw: unknown): AiMarketProposal {
  if (!raw || typeof raw !== "object") throw new Error("Not an object");
  const r = raw as Record<string, unknown>;

  const question = asStr(r.question, "question");
  if (question.length > 140) throw new Error("question > 140 chars");
  if (!question.trim().endsWith("?")) throw new Error("question must end with ?");

  const description = asStr(r.description, "description");
  const category = asStr(r.category, "category");
  if (!AI_CATEGORIES.includes(category as AiCategory)) {
    throw new Error(`category must be one of ${AI_CATEGORIES.join(",")}`);
  }

  const imageUrl = typeof r.imageUrl === "string" ? r.imageUrl : "";
  const resolutionDays = Math.max(1, Math.min(30, Math.round(Number(r.resolutionDays ?? 7))));

  const out: AiMarketProposal = {
    question: question.trim(),
    description: description.trim(),
    category: category as AiCategory,
    imageUrl,
    resolutionDays,
  };

  if (r.crypto && typeof r.crypto === "object") {
    const c = r.crypto as Record<string, unknown>;
    const coin = asStr(c.coin, "crypto.coin");
    if (!TRACKED_COIN_IDS.includes(coin as CoinId)) {
      // ignore crypto block for untracked coins
      return out;
    }
    const startUsd = Number(c.startUsd);
    const targetUsd = Number(c.targetUsd);
    if (!Number.isFinite(startUsd) || !Number.isFinite(targetUsd)) {
      return out;
    }
    out.crypto = {
      coin: coin as CoinId,
      startUsd,
      targetUsd,
    };
  }

  return out;
}

function asStr(v: unknown, label: string): string {
  if (typeof v !== "string" || !v.trim()) throw new Error(`${label} missing or not string`);
  return v;
}
