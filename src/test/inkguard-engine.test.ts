import { describe, expect, it } from "vitest";

import { check, type BrandFact, type BrandRule } from "@/lib/inkguard-engine";

// Mirrors the uploaded backend/test_engine.py, one assertion per rule.
const RULES: BrandRule[] = [
  { id: "R-01", type: "ban", approved: true, page: 4, quote: "Never use cheap.", terms: { cheap: "affordable" } },
];
const FACTS: BrandFact[] = [
  { id: "F-012", kw: ["customers"], val: 100000, owner: "Marketing", expires: "2099-01-01" },
];

describe("InkGuard engine (port of test_engine.py)", () => {
  it("flags a conflicting number", () => {
    const findings = check("Trusted by 1 million customers.", RULES, FACTS);
    expect(findings.some((f) => f.kind === "conflict" && f.ref === "F-012")).toBe(true);
  });

  it("marks a number that matches an approved fact as verified", () => {
    const findings = check("Trusted by 100,000 customers.", RULES, FACTS);
    expect(findings.some((f) => f.kind === "verified")).toBe(true);
  });

  it("never calls a number without a matching fact false", () => {
    const findings = check("We have 5 offices.", RULES, FACTS);
    expect(findings.every((f) => f.kind !== "conflict")).toBe(true);
  });

  it("flags banned terms", () => {
    const findings = check("Our cheap plan.", RULES, FACTS);
    expect(findings.some((f) => f.kind === "rule")).toBe(true);
  });
});
