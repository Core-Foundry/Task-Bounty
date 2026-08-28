import { NextRequest, NextResponse } from "next/server";
import {
  validateImportData,
  parseCSV,
  GRANT_IMPORT_SCHEMA,
  type FieldSchema,
} from "@/lib/import-validation";

/**
 * POST /api/import
 * Body: { format: "csv" | "json", data: string | Record<string, unknown>[] }
 *
 * Validates bulk grant data before import.
 * Returns { valid, errors, totalRows, validCount, errorCount }.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const format = String(body.format ?? "json");
  const rawData = body.data;

  let rows: Record<string, unknown>[] = [];

  if (format === "csv") {
    if (typeof rawData !== "string") {
      return NextResponse.json(
        { error: "CSV format requires 'data' to be a string." },
        { status: 400 },
      );
    }
    rows = parseCSV(rawData);
  } else {
    if (!Array.isArray(rawData)) {
      return NextResponse.json(
        { error: "JSON format requires 'data' to be an array of objects." },
        { status: 400 },
      );
    }
    rows = rawData as Record<string, unknown>[];
  }

  if (rows.length === 0) {
    return NextResponse.json({
      valid: [],
      errors: [],
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
    });
  }

  // Use default schema (can be extended to accept custom schema in the future)
  const result = validateImportData(rows, GRANT_IMPORT_SCHEMA);

  return NextResponse.json(result);
}
