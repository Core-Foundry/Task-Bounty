/**
 * Accessibility tests for ContributorProfileCard.
 *
 * Uses renderToStaticMarkup pattern (no jsdom needed).
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ContributorProfileCard from "./ContributorProfileCard";

vi.mock("@/lib/contributor-profile", () => ({
  calculateContributorProfileCompletion: vi.fn(() => ({
    percentage: 50,
    missingFields: [
      { key: "bio", label: "Bio" },
      { key: "location", label: "Location" },
      { key: "website", label: "Website" },
    ],
  })),
}));

describe("ContributorProfileCard — form accessibility", () => {
  it("renders a <form> element with novalidate", () => {
    const html = renderToStaticMarkup(<ContributorProfileCard />);

    expect(html).toContain("<form");
    expect(html).toContain('noValidate');
  });

  it("form has an accessible aria-label", () => {
    const html = renderToStaticMarkup(<ContributorProfileCard />);

    expect(html).toContain('aria-label="Contributor profile fields"');
  });

  it("each field has a label with htmlFor matching an input/textarea id", () => {
    const html = renderToStaticMarkup(<ContributorProfileCard />);

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

  it("inputs have aria-required and aria-invalid attributes", () => {
    const html = renderToStaticMarkup(<ContributorProfileCard />);

    expect(html).toContain('aria-required="false"');
    expect(html).toContain('aria-invalid="true"');
  });

  it("progress bar has role=progressbar with accessible label", () => {
    const html = renderToStaticMarkup(<ContributorProfileCard />);

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="50"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('aria-label="Profile 50% complete"');
  });

  it("suggested next steps use role=alert with aria-live=polite", () => {
    const html = renderToStaticMarkup(<ContributorProfileCard />);

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Suggested next steps");
  });

  it("completion status icons have aria-label", () => {
    const html = renderToStaticMarkup(<ContributorProfileCard />);

    expect(html).toContain('aria-label="Missing"');
  });

  it("finds profile- prefixed field ids", () => {
    const html = renderToStaticMarkup(<ContributorProfileCard />);

    expect(html).toContain('id="profile-name"');
    expect(html).toContain('id="profile-headline"');
    expect(html).toContain('id="profile-bio"');
  });
});
