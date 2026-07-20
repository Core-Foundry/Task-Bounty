/**
 * Accessibility tests for WaitlistHeroSection — refs #83.
 *
 * Uses the same renderToStaticMarkup pattern as FaqSection.test.tsx so no
 * additional dependencies are required.
 */
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import WaitlistHeroSection from "./WaitlistHeroSection";

// next/image is a server component that needs a mock in vitest
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string | { src: string };
    fill?: boolean;
  }) => (
    <img
      src={typeof src === "string" ? src : src.src}
      alt={alt ?? ""}
      {...props}
    />
  ),
}));

describe("WaitlistHeroSection — form accessibility (issue #83)", () => {
  it("renders a <label> with htmlFor matching the email input id", () => {
    const html = renderToStaticMarkup(<WaitlistHeroSection />);

    // Label must reference the input by id
    expect(html).toMatch(/for="waitlist-email"/);
    expect(html).toMatch(/id="waitlist-email"/);
  });

  it("email input has aria-required", () => {
    const html = renderToStaticMarkup(<WaitlistHeroSection />);

    expect(html).toContain('aria-required="true"');
  });

  it("email input references the live-region message via aria-describedby", () => {
    const html = renderToStaticMarkup(<WaitlistHeroSection />);

    expect(html).toContain('aria-describedby="waitlist-email-message"');
    expect(html).toContain('id="waitlist-email-message"');
  });

  it("live region is always present in the DOM (persistent container pattern)", () => {
    const html = renderToStaticMarkup(<WaitlistHeroSection />);

    // The message container must always be in the DOM so the browser registers
    // the aria-live contract on mount. Conditionally rendering role="alert" is
    // unreliable in some screen readers.
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('aria-atomic="true"');
  });

  it("aria-invalid defaults to false (no error on initial render)", () => {
    const html = renderToStaticMarkup(<WaitlistHeroSection />);

    expect(html).toContain('aria-invalid="false"');
  });
});
