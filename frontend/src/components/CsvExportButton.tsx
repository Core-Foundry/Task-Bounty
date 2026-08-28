"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CsvExportButtonProps {
  apiEndpoint?: string;
  queryFilters?: Record<string, string | number | undefined>;
  className?: string;
  label?: string;
  fileName?: string;
  onExportSuccess?: () => void;
  onExportError?: (error: Error) => void;
}

export function CsvExportButton({
  apiEndpoint = "/api/tasks/export/csv",
  queryFilters = {},
  className = "",
  label = "Export CSV",
  fileName,
  onExportSuccess,
  onExportError,
}: CsvExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryFilters)) {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        }
      }

      const queryString = params.toString();
      const url = queryString ? `${apiEndpoint}?${queryString}` : apiEndpoint;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      // Determine download filename
      let resolvedFileName = fileName;
      if (!resolvedFileName) {
        const disposition = response.headers.get("Content-Disposition");
        if (disposition && disposition.includes("filename=")) {
          const match = disposition.match(/filename="?([^"]+)"?/);
          if (match && match[1]) {
            resolvedFileName = match[1];
          }
        }
      }
      link.download = resolvedFileName || `grants-export-${new Date().toISOString().slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      onExportSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to export CSV");
      onExportError?.(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      aria-label={label}
      aria-busy={isExporting}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      <span>{isExporting ? "Exporting..." : label}</span>
    </Button>
  );
}

export default CsvExportButton;
