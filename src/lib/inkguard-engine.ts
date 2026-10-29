/**
 * TypeScript port of the uploaded InkGuard backend engine (backend/engine.py),
 * kept logic-for-logic identical so the demo API returns the same findings the
 * Python engine would.
 */

export type FindingKind =
  | "rule"
  | "conflict"
  | "stale"
  | "unverified"
  | "verified"
  | "tone"
  | "inject";

export interface Finding {
  kind: FindingKind;
  ref: string; // rule or fact ID, e.g. "R-01" or "F-012"
  start: number; // span in the draft text
  end: number;
  message: string;
  proof?: string | null; // rule quote, or fact details
  fix?: string | null; // replacement text for text[start:end]
  source: "code" | "ai";
}

export interface BrandRule {
  id: string;
  type: string;
  approved: boolean;
  page: number;
  quote: string;
  /** term -> suggested replacement (null when the compiler must not invent one) */
  terms: Record<string, string | null>;
}

export interface BrandFact {
  id: string;
  kw: string[];
  val: number;
  owner: string;
  /** ISO date, e.g. "2026-12-31" */
  expires: string;
}

const MULT: Record<string, number> = { million: 1_000_000, lakh: 100_000, k: 1_000 };
const SENTENCE_ENDS = [".", "!", "?"];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Python's text.rfind(c, 0, pos) for each sentence-ending char. */
function lastSentenceEnd(text: string, pos: number): number {
  if (pos - 1 < 0) return -1;
  let best = -1;
  for (const c of SENTENCE_ENDS) {
    const i = text.lastIndexOf(c, pos - 1);
    if (i > best) best = i;
  }
  return best;
}

function sentenceOf(text: string, pos: number): string {
  const start = lastSentenceEnd(text, pos) + 1;
  let next = -1;
  for (const c of SENTENCE_ENDS) {
    const i = text.indexOf(c, pos);
    if (i !== -1 && (next === -1 || i < next)) next = i;
  }
  const stop = next !== -1 ? next + 1 : text.length;
  return text.slice(start, stop).toLowerCase();
}

function checkBanned(text: string, rules: BrandRule[]): Finding[] {
  const out: Finding[] = [];
  for (const r of rules) {
    if (r.type !== "ban" || !r.approved) continue;
    for (const [term, sub] of Object.entries(r.terms)) {
      const re = new RegExp("\\b" + escapeRegExp(term) + "\\b", "gi");
      for (const m of text.matchAll(re)) {
        out.push({
          kind: "rule",
          ref: r.id,
          start: m.index,
          end: m.index + m[0].length,
          message: `Banned term '${m[0]}'.`,
          proof: `${r.id}, page ${r.page}: ${r.quote}`,
          fix: sub ?? null,
          source: "code",
        });
      }
    }
  }
  return out;
}

/** Midnight of today, UTC, as epoch ms (mirrors date.today()). */
function todayMs(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function checkClaims(text: string, facts: BrandFact[]): Finding[] {
  const out: Finding[] = [];
  const re = /(\d[\d,]*\.?\d*)\s*(million|lakh|k)?\+?/gi;
  for (const m of text.matchAll(re)) {
    const value = parseFloat(m[1].replace(/,/g, "")) * (MULT[(m[2] ?? "").toLowerCase()] ?? 1);
    const sent = sentenceOf(text, m.index);
    const fact = facts.find((f) => f.kw.some((k) => sent.includes(k)));
    const s = m.index;
    const e = m.index + m[0].length;
    if (!fact) {
      out.push({
        kind: "unverified",
        ref: "claim",
        start: s,
        end: e,
        message: "No approved fact on file. Unverified, not false.",
        source: "code",
      });
      continue;
    }
    const info = `${fact.id} · owner ${fact.owner} · expires ${fact.expires}`;
    if (Date.parse(fact.expires + "T00:00:00Z") < todayMs()) {
      out.push({
        kind: "stale",
        ref: fact.id,
        start: s,
        end: e,
        message: `Fact ${fact.id} has expired. ${fact.owner} should refresh it.`,
        proof: info,
        source: "code",
      });
    } else if (value !== fact.val) {
      out.push({
        kind: "conflict",
        ref: fact.id,
        start: s,
        end: e,
        message: `Conflicts with ${fact.id} (value ${Math.trunc(fact.val).toLocaleString("en-US")}).`,
        proof: info,
        fix: Math.trunc(fact.val).toLocaleString("en-US"),
        source: "code",
      });
    } else {
      out.push({
        kind: "verified",
        ref: fact.id,
        start: s,
        end: e,
        message: `Matches ${fact.id}.`,
        proof: info,
        source: "code",
      });
    }
  }
  return out;
}

export function check(text: string, rules: BrandRule[], facts: BrandFact[]): Finding[] {
  return [...checkBanned(text, rules), ...checkClaims(text, facts)].sort(
    (a, b) => a.start - b.start,
  );
}

type Key = `${FindingKind}|${string}`;

function keys(findings: Finding[]): Map<Key, number> {
  const counts = new Map<Key, number>();
  for (const f of findings) {
    if (f.kind === "verified" || f.kind === "tone") continue;
    const k = `${f.kind}|${f.ref}` as Key;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** Model proposes, code decides: return the fixed text only if it passes every check. */
export function verifiedFix(
  text: string,
  finding: Finding,
  rules: BrandRule[],
  facts: BrandFact[],
): string | null {
  if (!finding.fix) return null;
  const candidate = text.slice(0, finding.start) + finding.fix + text.slice(finding.end);
  const before = keys(check(text, rules, facts));
  const after = keys(check(candidate, rules, facts));
  let beforeTotal = 0;
  for (const v of before.values()) beforeTotal += v;
  let afterTotal = 0;
  let strictlyBetter = true;
  for (const [k, v] of after) {
    afterTotal += v;
    if (v > (before.get(k) ?? 0)) strictlyBetter = false;
  }
  if (afterTotal < beforeTotal && strictlyBetter) return candidate;
  return null;
}
