import { NextRequest, NextResponse } from "next/server";
import {
  createOrganization,
  listOrganizations,
  listOrganizationsByAdmin,
} from "@/lib/organization-profile";

/**
 * GET /api/organizations?adminAddress=<wallet>
 * List all organizations, or filter by admin.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminAddress = searchParams.get("adminAddress");

  if (adminAddress) {
    const result = listOrganizationsByAdmin(adminAddress);
    return NextResponse.json(result);
  }

  const result = listOrganizations();
  return NextResponse.json(result);
}

/**
 * POST /api/organizations
 * Body: { name, description, website?, contactEmail?, logoUrl?, adminAddress }
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

  const result = createOrganization({
    name: String(body.name ?? ""),
    description: String(body.description ?? ""),
    website: body.website ? String(body.website) : undefined,
    contactEmail: body.contactEmail ? String(body.contactEmail) : undefined,
    logoUrl: body.logoUrl ? String(body.logoUrl) : undefined,
    adminAddress: String(body.adminAddress ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ organization: result.organization }, { status: 201 });
}
