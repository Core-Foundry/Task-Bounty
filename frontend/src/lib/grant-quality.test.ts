import { describe, expect, it } from "vitest";

import {
  GRADE_THRESHOLDS,
  QUALITY_FIELD_WEIGHTS,
  QUALITY_FIELDS,
  formatQualityLabel,
  formatQualitySummary,
  isFieldPresent,
  listLowQualityGrants,
  scoreAllGrants,
  scoreGrantQuality,
  scoreToGrade,
} from "./grant-quality";
import type { GrantRecord } from "@/types/grant";

// ── Test fixtures ─────────────────────────────────────────────────────────────

const ADDRESS = `G${"A".repeat(55)}`;

/** A completely filled-out grant record — should score 100. */
function makeFullGrant(overrides: Partial<GrantRecord> = {}): GrantRecord {
  return {
    id: "grant-full",
    title: "Community Tooling Grant",
    funder: "Stellar Foundation",
    deadline: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days out
    status: "active",
    owner: "GABC",
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
    // Enrichment fields
    description: "Funds development of open-source tooling for the Stellar ecosystem.",
    website: "https://example.org/grant",
    contactEmail: "grants@example.org",
    category: "tooling",
    amount: 5000,
    currency: "USDC",
    recipientName: "Ada Lovelace",
    recipientAddress: ADDRESS,
    updatedAt: new Date("2026-02-01T12:00:00.000Z"),
    ...overrides,
  };
}

/** Minimum valid grant — only required fields, all enrichment fields absent. */
function makeMinimalGrant(overrides: Partial<GrantRecord> = {}): GrantRecord {
  return {
    id: "grant-minimal",
    title: "Minimal Grant",
    funder: "Some Org",
    deadline: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    status: "active",
    owner: "GABC",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

// ── Weight table integrity ────────────────────────────────────────────────────

describe("QUALITY_FIELD_WEIGHTS integrity", () => {
  it("weights sum to exactly 100", () => {
    const total = Object.values(QUALITY_FIELD_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("every field in QUALITY_FIELDS has a weight", () => {
    for (const field of QUALITY_FIELDS) {
      expect(QUALITY_FIELD_WEIGHTS).toHaveProperty(field);
      expect(QUALITY_FIELD_WEIGHTS[field]).toBeGreaterThan(0);
    }
  });

  it("every weighted field appears in QUALITY_FIELDS", () => {
    for (const field of Object.keys(QUALITY_FIELD_WEIGHTS)) {
      expect(QUALITY_FIELDS).toContain(field);
    }
  });
});

// ── Grade thresholds ──────────────────────────────────────────────────────────

describe("scoreToGrade", () => {
  it("returns A for 90–100", () => {
    expect(scoreToGrade(100)).toBe("A");
    expect(scoreToGrade(90)).toBe("A");
    expect(scoreToGrade(95)).toBe("A");
  });

  it("returns B for 75–89", () => {
    expect(scoreToGrade(89)).toBe("B");
    expect(scoreToGrade(75)).toBe("B");
    expect(scoreToGrade(80)).toBe("B");
  });

  it("returns C for 60–74", () => {
    expect(scoreToGrade(74)).toBe("C");
    expect(scoreToGrade(60)).toBe("C");
  });

  it("returns D for 40–59", () => {
    expect(scoreToGrade(59)).toBe("D");
    expect(scoreToGrade(40)).toBe("D");
  });

  it("returns F for 0–39", () => {
    expect(scoreToGrade(39)).toBe("F");
    expect(scoreToGrade(0)).toBe("F");
    expect(scoreToGrade(1)).toBe("F");
  });

  it("covers all 5 grades", () => {
    const grades = new Set(GRADE_THRESHOLDS.map((t) => t.grade));
    expect(grades).toEqual(new Set(["A", "B", "C", "D", "F"]));
  });
});

// ── Field presence checks ─────────────────────────────────────────────────────

describe("isFieldPresent", () => {
  it("treats a non-empty title as present", () => {
    expect(isFieldPresent(makeFullGrant(), "title")).toBe(true);
  });

  it("treats an empty title string as missing", () => {
    expect(isFieldPresent(makeFullGrant({ title: "" }), "title")).toBe(false);
  });

  it("treats a whitespace-only title as missing", () => {
    expect(isFieldPresent(makeFullGrant({ title: "   " }), "title")).toBe(false);
  });

  it("treats a positive deadline as present", () => {
    expect(isFieldPresent(makeFullGrant(), "deadline")).toBe(true);
  });

  it("treats a zero deadline as missing", () => {
    expect(isFieldPresent(makeFullGrant({ deadline: 0 }), "deadline")).toBe(false);
  });

  it("treats a negative deadline as missing", () => {
    expect(isFieldPresent(makeFullGrant({ deadline: -1 }), "deadline")).toBe(false);
  });

  it("treats a positive amount as present", () => {
    expect(isFieldPresent(makeFullGrant({ amount: 100 }), "amount")).toBe(true);
  });

  it("treats zero amount as missing", () => {
    expect(isFieldPresent(makeFullGrant({ amount: 0 }), "amount")).toBe(false);
  });

  it("treats a negative amount as missing", () => {
    expect(isFieldPresent(makeFullGrant({ amount: -5 }), "amount")).toBe(false);
  });

  it("treats undefined optional fields as missing", () => {
    const grant = makeMinimalGrant();
    const optionalFields = [
      "description",
      "website",
      "contactEmail",
      "category",
      "currency",
      "recipientName",
      "recipientAddress",
    ] as const;
    for (const field of optionalFields) {
      expect(isFieldPresent(grant, field)).toBe(false);
    }
  });

  it("treats a populated optional field as present", () => {
    expect(isFieldPresent(makeFullGrant(), "description")).toBe(true);
    expect(isFieldPresent(makeFullGrant(), "website")).toBe(true);
    expect(isFieldPresent(makeFullGrant(), "contactEmail")).toBe(true);
    expect(isFieldPresent(makeFullGrant(), "category")).toBe(true);
    expect(isFieldPresent(makeFullGrant(), "currency")).toBe(true);
    expect(isFieldPresent(makeFullGrant(), "recipientName")).toBe(true);
    expect(isFieldPresent(makeFullGrant(), "recipientAddress")).toBe(true);
  });

  it("treats a whitespace-only optional field as missing", () => {
    expect(isFieldPresent(makeFullGrant({ description: "   " }), "description")).toBe(false);
    expect(isFieldPresent(makeFullGrant({ website: "" }), "website")).toBe(false);
  });
});

// ── scoreGrantQuality — full record ──────────────────────────────────────────

describe("scoreGrantQuality — complete grant", () => {
  it("scores a fully populated grant at 100", () => {
    const result = scoreGrantQuality(makeFullGrant());
    expect(result.score).toBe(100);
  });

  it("grades a perfect grant as A", () => {
    expect(scoreGrantQuality(makeFullGrant()).grade).toBe("A");
  });

  it("marks a perfect grant as complete", () => {
    expect(scoreGrantQuality(makeFullGrant()).isComplete).toBe(true);
  });

  it("has no missing fields for a perfect grant", () => {
    expect(scoreGrantQuality(makeFullGrant()).missingFields).toHaveLength(0);
  });

  it("lists all quality fields as present for a perfect grant", () => {
    const result = scoreGrantQuality(makeFullGrant());
    expect(result.presentFields.sort()).toEqual([...QUALITY_FIELDS].sort());
  });
});

// ── scoreGrantQuality — minimal record ───────────────────────────────────────

describe("scoreGrantQuality — minimal grant (required fields only)", () => {
  it("scores a minimal grant at title + funder + deadline weight sum", () => {
    const grant = makeMinimalGrant();
    const expected =
      QUALITY_FIELD_WEIGHTS.title +
      QUALITY_FIELD_WEIGHTS.funder +
      QUALITY_FIELD_WEIGHTS.deadline;
    expect(scoreGrantQuality(grant).score).toBe(expected);
  });

  it("does not mark minimal grant as complete", () => {
    expect(scoreGrantQuality(makeMinimalGrant()).isComplete).toBe(false);
  });

  it("grades a minimal grant as D (only 45 points)", () => {
    // title(15)+funder(15)+deadline(15) = 45 → grade D (40–59 range)
    expect(scoreGrantQuality(makeMinimalGrant()).grade).toBe("D");
  });

  it("lists enrichment fields as missing", () => {
    const result = scoreGrantQuality(makeMinimalGrant());
    expect(result.missingFields).toContain("description");
    expect(result.missingFields).toContain("website");
    expect(result.missingFields).toContain("contactEmail");
    expect(result.missingFields).toContain("recipientName");
    expect(result.missingFields).toContain("recipientAddress");
  });
});

// ── scoreGrantQuality — empty / degenerate record ────────────────────────────

describe("scoreGrantQuality — empty values", () => {
  it("scores zero when title, funder, and deadline are empty/zero", () => {
    const grant = makeMinimalGrant({ title: "", funder: "", deadline: 0 });
    expect(scoreGrantQuality(grant).score).toBe(0);
  });

  it("grades a zero-score grant as F", () => {
    const grant = makeMinimalGrant({ title: "", funder: "", deadline: 0 });
    expect(scoreGrantQuality(grant).grade).toBe("F");
  });

  it("marks a zero-score grant as incomplete", () => {
    const grant = makeMinimalGrant({ title: "", funder: "", deadline: 0 });
    expect(scoreGrantQuality(grant).isComplete).toBe(false);
  });
});

// ── scoreGrantQuality — partial enrichment ────────────────────────────────────

describe("scoreGrantQuality — partial enrichment", () => {
  it("adding description increases the score by its weight", () => {
    const base = scoreGrantQuality(makeMinimalGrant()).score;
    const enriched = scoreGrantQuality(
      makeMinimalGrant({ description: "A real description." }),
    ).score;
    expect(enriched - base).toBe(QUALITY_FIELD_WEIGHTS.description);
  });

  it("adding recipientName and recipientAddress moves score up by their weights", () => {
    const base = scoreGrantQuality(makeMinimalGrant()).score;
    const enriched = scoreGrantQuality(
      makeMinimalGrant({ recipientName: "Alice", recipientAddress: ADDRESS }),
    ).score;
    expect(enriched - base).toBe(
      QUALITY_FIELD_WEIGHTS.recipientName + QUALITY_FIELD_WEIGHTS.recipientAddress,
    );
  });

  it("reflects B grade when score is in 75–89 range", () => {
    // Base = 45. Need 30+ more. description(8)+website(4)+contactEmail(4)+
    // category(4)+amount(8)+currency(7) = 35 → total 80 → B
    const grant = makeMinimalGrant({
      description: "desc",
      website: "https://x.test",
      contactEmail: "a@b.test",
      category: "tooling",
      amount: 100,
      currency: "XLM",
    });
    const result = scoreGrantQuality(grant);
    expect(result.score).toBe(80);
    expect(result.grade).toBe("B");
  });

  it("reflects C grade when score is in 60–74 range", () => {
    // Base 45 + description(8) + website(4) + contactEmail(4) = 61 → C
    const grant = makeMinimalGrant({
      description: "desc",
      website: "https://x.test",
      contactEmail: "a@b.test",
    });
    const result = scoreGrantQuality(grant);
    expect(result.score).toBe(61);
    expect(result.grade).toBe("C");
  });

  it("reflects D grade when score is in 40–59 range", () => {
    // Base 45 + category(4) = 49 → D
    const grant = makeMinimalGrant({ category: "tooling" });
    const result = scoreGrantQuality(grant);
    expect(result.score).toBe(49);
    expect(result.grade).toBe("D");
  });
});

// ── scoreGrantQuality — present/missing symmetry ──────────────────────────────

describe("scoreGrantQuality — present + missing fields cover all quality fields", () => {
  it("for a full grant", () => {
    const result = scoreGrantQuality(makeFullGrant());
    const union = [...result.presentFields, ...result.missingFields].sort();
    expect(union).toEqual([...QUALITY_FIELDS].sort());
  });

  it("for a minimal grant", () => {
    const result = scoreGrantQuality(makeMinimalGrant());
    const union = [...result.presentFields, ...result.missingFields].sort();
    expect(union).toEqual([...QUALITY_FIELDS].sort());
  });

  it("for a partially filled grant", () => {
    const result = scoreGrantQuality(makeMinimalGrant({ description: "x" }));
    const union = [...result.presentFields, ...result.missingFields].sort();
    expect(union).toEqual([...QUALITY_FIELDS].sort());
  });

  it("no field appears in both lists", () => {
    const result = scoreGrantQuality(makeMinimalGrant({ description: "x" }));
    const presentSet = new Set(result.presentFields);
    for (const field of result.missingFields) {
      expect(presentSet.has(field)).toBe(false);
    }
  });
});

// ── scoreAllGrants ────────────────────────────────────────────────────────────

describe("scoreAllGrants", () => {
  it("returns an entry for every grant", () => {
    const grants = [makeFullGrant(), makeMinimalGrant(), makeMinimalGrant({ id: "g3" })];
    expect(scoreAllGrants(grants)).toHaveLength(3);
  });

  it("sorts results lowest-score first", () => {
    const grants = [
      makeFullGrant({ id: "full" }),
      makeMinimalGrant({ id: "min" }),
      makeMinimalGrant({ id: "mid", description: "some desc", website: "https://x.test" }),
    ];
    const scored = scoreAllGrants(grants);
    expect(scored[0].grant.id).toBe("min");
    expect(scored[scored.length - 1].grant.id).toBe("full");
  });

  it("includes the quality object alongside the grant", () => {
    const scored = scoreAllGrants([makeFullGrant()]);
    expect(scored[0].quality).toBeDefined();
    expect(scored[0].quality.score).toBe(100);
    expect(scored[0].grant).toBeDefined();
  });

  it("returns an empty array for an empty input", () => {
    expect(scoreAllGrants([])).toEqual([]);
  });
});

// ── listLowQualityGrants ──────────────────────────────────────────────────────

describe("listLowQualityGrants", () => {
  const full = makeFullGrant({ id: "full" });
  const minimal = makeMinimalGrant({ id: "min" }); // score 45 → below 75
  const good = makeFullGrant({
    id: "good",
    // Remove the lower-weight fields to land just below A but in B territory
    description: undefined,
    website: undefined,
    contactEmail: undefined,
    category: undefined,
    // score = 100 - 8 - 4 - 4 - 4 = 80 → grade B, above default threshold
  });

  it("excludes grants at or above the threshold (default 75)", () => {
    const result = listLowQualityGrants([full, minimal, good]);
    const ids = result.map((r) => r.grant.id);
    expect(ids).not.toContain("full");
    expect(ids).not.toContain("good"); // 80 ≥ 75
    expect(ids).toContain("min"); // 45 < 75
  });

  it("includes grants strictly below the threshold", () => {
    const result = listLowQualityGrants([minimal]);
    expect(result).toHaveLength(1);
    expect(result[0].grant.id).toBe("min");
  });

  it("respects a custom threshold", () => {
    // With threshold=90, both minimal and good are low quality.
    const result = listLowQualityGrants([full, minimal, good], 90);
    const ids = result.map((r) => r.grant.id);
    expect(ids).toContain("min");
    expect(ids).toContain("good");
    expect(ids).not.toContain("full");
  });

  it("returns an empty list when all grants pass the threshold", () => {
    expect(listLowQualityGrants([full], 75)).toHaveLength(0);
  });

  it("returns an empty list for empty input", () => {
    expect(listLowQualityGrants([])).toHaveLength(0);
  });

  it("results are sorted worst-first", () => {
    const worst = makeMinimalGrant({ id: "worst", title: "", funder: "", deadline: 0 });
    const bad = makeMinimalGrant({ id: "bad" }); // 45
    const result = listLowQualityGrants([bad, worst]);
    expect(result[0].grant.id).toBe("worst");
    expect(result[1].grant.id).toBe("bad");
  });
});

// ── formatQualitySummary ──────────────────────────────────────────────────────

describe("formatQualitySummary", () => {
  it("returns an empty string for a complete record", () => {
    const quality = scoreGrantQuality(makeFullGrant());
    expect(formatQualitySummary(quality)).toBe("");
  });

  it("lists the missing fields for an incomplete record", () => {
    const quality = scoreGrantQuality(makeMinimalGrant());
    const summary = formatQualitySummary(quality);
    expect(summary).toMatch(/^Missing fields:/);
    expect(summary).toContain("description");
    expect(summary).toContain("website");
    expect(summary).toContain("recipientName");
  });

  it("mentions every missing field in the summary", () => {
    const quality = scoreGrantQuality(makeMinimalGrant());
    for (const field of quality.missingFields) {
      expect(formatQualitySummary(quality)).toContain(field);
    }
  });
});

// ── formatQualityLabel ────────────────────────────────────────────────────────

describe("formatQualityLabel", () => {
  it("formats a full grant label as A (100)", () => {
    expect(formatQualityLabel(makeFullGrant())).toBe("A (100)");
  });

  it("formats a minimal grant label as D (45)", () => {
    expect(formatQualityLabel(makeMinimalGrant())).toBe("D (45)");
  });

  it("includes the grade and numeric score separated by a space", () => {
    const label = formatQualityLabel(makeFullGrant());
    expect(label).toMatch(/^[ABCDF] \(\d+\)$/);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("scoreGrantQuality — edge cases", () => {
  it("handles a grant with a whitespace-only funder", () => {
    const grant = makeMinimalGrant({ funder: "   " });
    const result = scoreGrantQuality(grant);
    expect(result.missingFields).toContain("funder");
    expect(result.presentFields).not.toContain("funder");
  });

  it("handles amount of 0.001 (above zero) as present", () => {
    const grant = makeMinimalGrant({ amount: 0.001 });
    expect(isFieldPresent(grant, "amount")).toBe(true);
  });

  it("handles a grant created with createdAt as a Date object", () => {
    const grant = makeFullGrant({ createdAt: new Date() });
    expect(() => scoreGrantQuality(grant)).not.toThrow();
    expect(scoreGrantQuality(grant).score).toBe(100);
  });

  it("scoreAllGrants does not mutate the original array", () => {
    const grants = [makeMinimalGrant({ id: "a" }), makeFullGrant({ id: "b" })];
    const originalOrder = grants.map((g) => g.id);
    scoreAllGrants(grants);
    expect(grants.map((g) => g.id)).toEqual(originalOrder);
  });
});
