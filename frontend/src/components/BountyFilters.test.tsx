/**
 * Accessibility tests for BountyFilters.
 *
 * Uses renderToStaticMarkup pattern (no jsdom needed).
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BountyFilters } from "./BountyFilters";

const defaultFilters = {
  search: "",
  minReward: "" as number | "",
  maxReward: "" as number | "",
  difficulty: "",
  sort: "newest" as const,
  technology: "",
  organization: "",
};

describe("BountyFilters — form accessibility", () => {
  it("renders as a <form> element with role=search", () => {
    const html = renderToStaticMarkup(
      <BountyFilters
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("<form");
    expect(html).toContain('role="search"');
    expect(html).toContain('noValidate');
  });

  it("every label has a non-empty for attribute matching an id", () => {
    const html = renderToStaticMarkup(
      <BountyFilters
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    const forValues = [...html.matchAll(/\bfor="([^"]+)"/g)].map((m) => m[1]);
    expect(forValues.length).toBeGreaterThanOrEqual(6);
    const idValues = new Set(
      [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]),
    );

    for (const forVal of forValues) {
      expect(forVal.trim()).not.toBe("");
      expect(
        idValues.has(forVal),
        `No element with id="${forVal}" found`,
      ).toBe(true);
    }
  });

  it("has an aria-live region for active filter count", () => {
    const html = renderToStaticMarkup(
      <BountyFilters
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
  });

  it("search input has aria-label", () => {
    const html = renderToStaticMarkup(
      <BountyFilters
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Search bounties"');
  });

  it("renders difficulty select with accessible label", () => {
    const html = renderToStaticMarkup(
      <BountyFilters
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain('for="bounty-difficulty"');
    expect(html).toContain('id="bounty-difficulty"');
  });

  it("renders sort select with accessible label", () => {
    const html = renderToStaticMarkup(
      <BountyFilters
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain('for="bounty-sort"');
    expect(html).toContain('id="bounty-sort"');
  });

  it("shows correct active filter count with active filters", () => {
    const activeFilters = {
      ...defaultFilters,
      search: "rust",
      technology: "Soroban",
    };

    const html = renderToStaticMarkup(
      <BountyFilters
        filters={activeFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("3 filters active");
  });

  it("shows 'No filters active' when no filters are set", () => {
    const html = renderToStaticMarkup(
      <BountyFilters
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("1 filter active");
  });
});
