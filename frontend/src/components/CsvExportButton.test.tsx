import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CsvExportButton } from "./CsvExportButton";

describe("CsvExportButton component", () => {
  it("renders accessible button with default label and aria attributes", () => {
    const html = renderToStaticMarkup(<CsvExportButton />);
    expect(html).toContain("Export CSV");
    expect(html).toContain('aria-label="Export CSV"');
    expect(html).toContain('type="button"');
  });

  it("renders custom label and custom className", () => {
    const html = renderToStaticMarkup(
      <CsvExportButton label="Download Grant Data" className="custom-export-class" />,
    );
    expect(html).toContain("Download Grant Data");
    expect(html).toContain('aria-label="Download Grant Data"');
    expect(html).toContain("custom-export-class");
  });
});
