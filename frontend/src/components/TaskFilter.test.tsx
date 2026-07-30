/**
 * Accessibility tests for TaskFilter — refs #83, #38.
 *
 * Uses the same renderToStaticMarkup pattern as FaqSection.test.tsx.
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskFilter, FilterState } from "./TaskFilter";

// Radix Select uses a browser portal; the trigger id is what matters for the
// label association test, which lives in the static HTML before hydration.
vi.mock("@/constants/mock-tasks", () => ({
  CATEGORIES: ["Design", "Engineering"],
  CONTRIBUTORS: ["Alice", "Bob"],
}));

const defaultFilters: FilterState = {
  category: "",
  contributor: "",
  minReward: "",
  maxReward: "",
  startDate: "",
  endDate: "",
};

describe("TaskFilter — form accessibility (issue #83)", () => {
  it("renders as a <form> element with role=search", () => {
    const html = renderToStaticMarkup(
      <TaskFilter
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("<form");
    expect(html).toContain('role="search"');
    expect(html).toContain('noValidate');
  });

  it("every label has a non-empty for attribute", () => {
    const html = renderToStaticMarkup(
      <TaskFilter
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    // Collect all for="..." values
    const forMatches = [...html.matchAll(/\bfor="([^"]+)"/g)].map((m) => m[1]);
    expect(forMatches.length).toBeGreaterThanOrEqual(6);
    for (const value of forMatches) {
      expect(value.trim()).not.toBe("");
    }
  });

  it("each label for= value matches an id= in the rendered HTML", () => {
    const html = renderToStaticMarkup(
      <TaskFilter
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    const forValues = [...html.matchAll(/\bfor="([^"]+)"/g)].map((m) => m[1]);
    const idValues = new Set(
      [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]),
    );

    for (const forVal of forValues) {
      expect(idValues.has(forVal), `No element with id="${forVal}" found`).toBe(
        true,
      );
    }
  });

  it("category label is associated with the SelectTrigger id", () => {
    const html = renderToStaticMarkup(
      <TaskFilter
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain('for="filter-category"');
    expect(html).toContain('id="filter-category"');
  });

  it("numeric reward inputs have associated labels and inputMode", () => {
    const html = renderToStaticMarkup(
      <TaskFilter
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain('for="filter-min-reward"');
    expect(html).toContain('id="filter-min-reward"');
    expect(html).toContain('for="filter-max-reward"');
    expect(html).toContain('id="filter-max-reward"');
    expect(html).toContain('inputMode="decimal"');
  });

  it("date inputs have associated labels", () => {
    const html = renderToStaticMarkup(
      <TaskFilter
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain('for="filter-start-date"');
    expect(html).toContain('id="filter-start-date"');
    expect(html).toContain('for="filter-end-date"');
    expect(html).toContain('id="filter-end-date"');
  });

  it("has an aria-live region for active filter count", () => {
    const html = renderToStaticMarkup(
      <TaskFilter
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
  });

  it("shows correct active filter count", () => {
    const activeFilters: FilterState = {
      ...defaultFilters,
      category: "Design",
      minReward: 10,
    };

    const html = renderToStaticMarkup(
      <TaskFilter
        filters={activeFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("2 filters active");
  });

  it("shows 'No filters active' when no filters are set", () => {
    const html = renderToStaticMarkup(
      <TaskFilter
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("No filters active");
  });

  it("select triggers have aria-label attributes", () => {
    const html = renderToStaticMarkup(
      <TaskFilter
        filters={defaultFilters}
        onFilterChange={() => {}}
        onReset={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Select category"');
    expect(html).toContain('aria-label="Select contributor"');
  });
});
