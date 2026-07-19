import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FaqSection from "./FaqSection";

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string | { src: string } }) => (
    <img src={typeof src === "string" ? src : src.src} alt={alt} {...props} />
  ),
}));

describe("FaqSection", () => {
  it("renders each question as a keyboard-focusable button", () => {
    const html = renderToStaticMarkup(<FaqSection />);

    expect(html).toContain("<button");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('type="button"');
  });
});
