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

/**
 * Mandatory opener forms. One is picked per call and the model MUST use it.
 * Each entry: { label, example, regex the question must match (case-insensitive). }
 */
const OPENER_FORMS = [
  {
    label: "Does <subject> <verb> …?",
    example: "Does ARC hit 200k followers by May 31, 2026?",
    pattern: "^Does\\s+\\S+",
  },
  {
    label: "Can <subject> …?",
    example: "Can SOL break $300 before week's end?",
    pattern: "^Can\\s+\\S+",
  },
  {
    label: "Is <subject> going to …?",
    example: "Is Bitcoin going to clear $150k this month?",
    pattern: "^Is\\s+\\S+",
  },
  {
    label: "By <date>, <clause>?",
    example: "By May 31, 2026, has ARC crossed 200k followers?",
    pattern: "^By\\s+\\S+",
  },
  {
    label: "Has <subject> <past-participle> by <date>?",
    example: "Has ARC reached 200k followers by May 31?",
    pattern: "^Has\\s+\\S+",
  },
  {
    label: "<Subject> <metric> by <date>?  (no auxiliary opener)",
    example: "ARC at 200k followers by May 31, 2026?",
    pattern: "^(?!Will\\b|Does\\b|Can\\b|Is\\b|By\\b|Has\\b|Are\\b|Do\\b)\\S+",
  },
  {
    label: "Are <subjects> …?",
    example: "Are the Lakers winning their next game?",
    pattern: "^Are\\s+\\S+",
  },
  {
    label: "Hits <threshold> before <date>?",
    example: "Hits $150k before May 31?",
    pattern: "^Hits\\s+\\S+",
  },
  {
    label: "Will <subject> …?  (only allowed occasionally)",
    example: "Will ETH close above $2,500 by Friday?",
    pattern: "^Will\\s+\\S+",
  },
] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick an opener, heavily biased away from "Will" when existing markets already overuse it. */
function pickOpener(existingQuestions: string[]): (typeof OPENER_FORMS)[number] {
  const willCount = existingQuestions.filter((q) => /^\s*Will\b/i.test(q)).length;
  const willRatio = existingQuestions.length === 0 ? 0 : willCount / existingQuestions.length;
  const nonWill = OPENER_FORMS.filter((o) => !o.label.startsWith("Will"));
  // If >40% of existing already start with "Will", forbid it this call.
  if (willRatio > 0.4) return pick(nonWill);
  // Otherwise 90% non-Will, 10% Will to keep some natural mix.
  return Math.random() < 0.9 ? pick(nonWill) : OPENER_FORMS[OPENER_FORMS.length - 1];
}

export interface SystemPromptBuild {
  prompt: string;
  willForbidden: boolean;
  openerLabel: string;
}

/** Build the system prompt. `nowIso` is injected server-side each call. */
export function buildSystemPrompt(
  nowIso: string,
  coinPrices: PriceMap | null,
  existingQuestions: string[] = [],
): SystemPromptBuild {
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
  const opener = pickOpener(existingQuestions);
  const nonce = Math.random().toString(36).slice(2, 8);
  const willForbidden = !opener.label.startsWith("Will");

  const prompt = `You are Propex's market-proposal engine. Given a free-form admin instruction,
you produce a JSON object describing a binary (YES/NO) prediction market.

CURRENT DATE (UTC): ${nowIso}
DIVERSITY NONCE: ${nonce}
STYLE FOR THIS CALL: ${style}

REQUIRED OPENER FOR THIS CALL: ${opener.label}
EXAMPLE OF THIS OPENER: "${opener.example}"
${willForbidden ? 'THE WORD "Will" IS FORBIDDEN AS THE FIRST WORD OF "question" THIS CALL.' : ""}

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
- OPENER (HARD RULE): the first word(s) of "question" MUST match REQUIRED OPENER FOR THIS CALL. If the opener forbids "Will", then "question" must NOT begin with "Will". Re-phrase the same factual market under the required opener — do not change the underlying subject.
- If the instruction is vague, still return a valid proposal but MAKE the resolution criteria tight and objective (e.g. "according to CoinGecko spot price on <ISO date>"). Pick a fresh subject the admin has not already covered (see EXISTING MARKETS).
- If the instruction mentions a coin not in the tracked list, still pick category="Crypto" but omit the "crypto" key and write the resolution source explicitly into "description".
- resolutionDays: map phrases like "today"->1, "this week"->7, "this month"->30. Default to 7 if unclear.
- For crypto targets, infer direction from the instruction ("hits", "above", "over" -> target > start; "below", "under", "drops to" -> target < start). If no direction given, assume +2% above start.
- Never invent dates in the past. Resolution is always in the future.
- imageUrl for crypto should be the CoinGecko logo: https://assets.coingecko.com/coins/images/<n>/large/<name>.png — use "" if you are not certain of the exact URL; the server will populate it.
`;

  return { prompt, willForbidden, openerLabel: opener.label };
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
