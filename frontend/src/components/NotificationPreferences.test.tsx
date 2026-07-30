/**
 * Tests for NotificationPreferences component.
 *
 * Uses renderToStaticMarkup (no jsdom needed) so the node test environment
 * works without extra configuration — same pattern as WaitlistHeroSection.test.tsx.
 *
 * Note: because renderToStaticMarkup does not hydrate or run useEffect, the
 * component always renders in its loading=false state when called directly from
 * server context. We mock the hook to control the state.
 */
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationPreferences,
} from "@/hooks/useNotificationPreferences";

// ---------------------------------------------------------------------------
// Mock the hook so we control what the component renders
// ---------------------------------------------------------------------------

const mockToggle = vi.fn();
const mockSetAll = vi.fn();
const mockUpdate = vi.fn();
const mockReset = vi.fn();

let mockPreferences: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
let mockIsLoading = false;

vi.mock("@/hooks/useNotificationPreferences", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/hooks/useNotificationPreferences")
  >();
  return {
    ...original,
    useNotificationPreferences: () => ({
      preferences: mockPreferences,
      isLoading: mockIsLoading,
      toggle: mockToggle,
      setAll: mockSetAll,
      update: mockUpdate,
      reset: mockReset,
    }),
  };
});

// Re-import after mock is set up
async function renderComponent(props: Record<string, unknown> = {}) {
  const { default: NotificationPreferences } = await import(
    "./NotificationPreferences"
  );
  return renderToStaticMarkup(
    React.createElement(NotificationPreferences, props),
  );
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe("NotificationPreferences — loading skeleton", () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsLoading = true;
    mockPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  });

  afterEach(() => {
    mockIsLoading = false;
  });

  it("renders an accessible loading region when isLoading is true", async () => {
    const html = await renderComponent();
    expect(html).toContain("aria-label");
    expect(html.toLowerCase()).toMatch(/loading/);
  });

  it("does not render category labels while loading", async () => {
    const html = await renderComponent();
    // No category labels should appear in skeleton
    expect(html).not.toContain(NOTIFICATION_CATEGORY_LABELS.payments.label);
  });
});

describe("NotificationPreferences — loaded state", () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsLoading = false;
    mockPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
  });

  it("renders a section with aria-label for the preferences panel", async () => {
    const html = await renderComponent();
    expect(html).toContain('aria-label="Notification preferences"');
  });

  it("renders a toggle switch for every notification category", async () => {
    const html = await renderComponent();
    for (const cat of NOTIFICATION_CATEGORIES) {
      expect(html).toContain(`notif-switch-${cat}`);
    }
  });

  it("each category switch has role='switch'", async () => {
    const html = await renderComponent();
    const switchCount = (html.match(/role="switch"/g) ?? []).length;
    expect(switchCount).toBe(NOTIFICATION_CATEGORIES.length);
  });

  it("each switch exposes aria-checked matching the preference state", async () => {
    // All defaults are true
    const html = await renderComponent();
    // All switches should be aria-checked="true"
    const checkedTrue = (html.match(/aria-checked="true"/g) ?? []).length;
    expect(checkedTrue).toBe(NOTIFICATION_CATEGORIES.length);
  });

  it("reflects disabled preferences with aria-checked='false'", async () => {
    mockPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      payments: false,
      disputes: false,
    };
    const html = await renderComponent();
    const checkedFalse = (html.match(/aria-checked="false"/g) ?? []).length;
    expect(checkedFalse).toBe(2);
  });

  it("renders category labels for all categories", async () => {
    const html = await renderComponent();
    for (const cat of NOTIFICATION_CATEGORIES) {
      expect(html).toContain(NOTIFICATION_CATEGORY_LABELS[cat].label);
    }
  });

  it("renders category descriptions for all categories", async () => {
    const html = await renderComponent();
    for (const cat of NOTIFICATION_CATEGORIES) {
      expect(html).toContain(NOTIFICATION_CATEGORY_LABELS[cat].description);
    }
  });

  it("renders the 'Enable all' button", async () => {
    const html = await renderComponent();
    expect(html).toContain("Enable all");
  });

  it("renders the 'Disable all' button", async () => {
    const html = await renderComponent();
    expect(html).toContain("Disable all");
  });

  it("renders the 'Reset to defaults' button", async () => {
    const html = await renderComponent();
    expect(html).toContain("Reset to defaults");
  });

  it("'Enable all' button is disabled when all categories are already enabled", async () => {
    // All defaults are true → allEnabled = true
    // renderToStaticMarkup renders boolean disabled as disabled="" in HTML
    const html = await renderComponent();
    expect(html).toMatch(/Enable all/);
    // Find the opening <button> tag that contains "Enable all" text
    const enableAllIdx = html.indexOf("Enable all");
    // Scan backwards ~300 chars to find the start of the <button> tag
    const surroundingHtml = html.substring(Math.max(0, enableAllIdx - 300), enableAllIdx + 50);
    // disabled attr is rendered as disabled="" by renderToStaticMarkup
    expect(surroundingHtml).toMatch(/disabled/);
  });

  it("'Disable all' button is disabled when all categories are already disabled", async () => {
    mockPreferences = {
      task_updates: false,
      submission_activity: false,
      payments: false,
      disputes: false,
      platform_announcements: false,
    };
    const html = await renderComponent();
    // When all categories are disabled, noneEnabled=true so the "Disable all"
    // button gets the disabled attribute. We look for a button that:
    //  (a) has disabled attribute, AND
    //  (b) contains "Disable all" as text
    // renderToStaticMarkup renders disabled as disabled="" in HTML.
    // We match a button tag with disabled="" that contains "Disable all".
    // The BellOff SVG is inside the button too, so we allow for arbitrary content.
    expect(html).toMatch(/<button[^>]+disabled[^>]*>[\s\S]*?Disable all[\s\S]*?<\/button>/);
  });

  it("each switch references its label via aria-labelledby", async () => {
    const html = await renderComponent();
    for (const cat of NOTIFICATION_CATEGORIES) {
      expect(html).toContain(`aria-labelledby="notif-label-${cat}"`);
      expect(html).toContain(`id="notif-label-${cat}"`);
    }
  });

  it("bulk actions are wrapped in a group with aria-label", async () => {
    const html = await renderComponent();
    expect(html).toContain('aria-label="Bulk actions"');
  });

  it("category list has a role='list' and aria-label", async () => {
    const html = await renderComponent();
    expect(html).toContain('role="list"');
    expect(html).toContain('aria-label="Notification categories"');
  });

  it("accepts an optional className prop", async () => {
    const html = await renderComponent({ className: "custom-class" });
    expect(html).toContain("custom-class");
  });
});
