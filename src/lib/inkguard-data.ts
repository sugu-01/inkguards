import type { BrandFact, BrandRule } from "@/lib/inkguard-engine";

/**
 * Demo data for the live /api/check endpoint. It mirrors the sample rules and
 * facts the page's local fallback uses (derived from backend/data/seed.json),
 * in the exact shape backend/engine.py expects: approved "ban" rules with
 * per-term replacements, and numeric facts with owner + expiry.
 */
export const DEMO_RULES: BrandRule[] = [
  {
    id: "R-01",
    type: "ban",
    approved: true,
    page: 3,
    quote: "Never use: guaranteed, risk-free, cure",
    terms: { guaranteed: null, "risk-free": null, cure: null },
  },
];

export const DEMO_FACTS: BrandFact[] = [
  { id: "F-01", kw: ["per month", "price"], val: 999, owner: "Finance", expires: "2026-12-31" },
  { id: "F-02", kw: ["refund"], val: 14, owner: "Operations", expires: "2027-01-15" },
  { id: "F-03", kw: ["diwali25"], val: 25, owner: "Marketing", expires: "2026-10-20" },
];
