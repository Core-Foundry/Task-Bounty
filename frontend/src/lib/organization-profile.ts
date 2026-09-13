/**
 * Issue #156: Add Organization Profiles for Grant Providers
 *
 * Creates dedicated profiles for organizations that publish or
 * manage grants. Grants can be linked to an organization and
 * organization pages display associated grants.
 */

export interface OrganizationProfile {
  id: string;
  name: string;
  description: string;
  website: string;
  contactEmail: string;
  logoUrl: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  /** Wallet address of the organization's admin. */
  adminAddress: string;
  /** Number of grants posted by this organization. */
  grantCount: number;
}

export interface OrganizationListResult {
  organizations: OrganizationProfile[];
  total: number;
}

type OrgSuccess<T> = { ok: true } & T;

type OrgFailure = {
  ok: false;
  status: 400 | 404 | 409;
  error: string;
};

export type OrgResult<T> = OrgSuccess<T> | OrgFailure;

// --- in-memory store ---

const organizations = new Map<string, OrganizationProfile>();
const nameIndex = new Map<string, string>(); // lowercase name -> id
const adminOrgs = new Map<string, Set<string>>(); // adminAddress -> Set<orgId>
let nextOrgId = 1;

/**
 * Create a new organization profile.
 */
export function createOrganization(
  input: {
    name: string;
    description: string;
    website?: string;
    contactEmail?: string;
    logoUrl?: string;
    adminAddress: string;
  },
  now: Date = new Date(),
): OrgResult<{ organization: OrganizationProfile }> {
  const name = input.name.trim();
  const description = input.description.trim();
  const adminAddress = input.adminAddress.trim();

  if (!name) {
    return { ok: false, status: 400, error: "Organization name is required." };
  }
  if (name.length > 200) {
    return { ok: false, status: 400, error: "Name must be 200 characters or less." };
  }
  if (!description) {
    return { ok: false, status: 400, error: "Description is required." };
  }
  if (!adminAddress) {
    return { ok: false, status: 400, error: "Admin address is required." };
  }

  // Check for duplicate name
  const lowerName = name.toLowerCase();
  if (nameIndex.has(lowerName)) {
    return { ok: false, status: 409, error: "An organization with this name already exists." };
  }

  const id = String(nextOrgId++);
  const ts = now.toISOString();

  const org: OrganizationProfile = {
    id,
    name,
    description,
    website: input.website?.trim() ?? "",
    contactEmail: input.contactEmail?.trim() ?? "",
    logoUrl: input.logoUrl?.trim() ?? "",
    verified: false,
    createdAt: ts,
    updatedAt: ts,
    adminAddress,
    grantCount: 0,
  };

  organizations.set(id, org);
  nameIndex.set(lowerName, id);

  // Add to admin's org set
  let orgSet = adminOrgs.get(adminAddress);
  if (!orgSet) {
    orgSet = new Set<string>();
    adminOrgs.set(adminAddress, orgSet);
  }
  orgSet.add(id);

  return { ok: true, organization: org };
}

/**
 * Get an organization by ID.
 */
export function getOrganization(orgId: string): OrganizationProfile | null {
  return organizations.get(orgId.trim()) ?? null;
}

/**
 * Get an organization by name (case-insensitive).
 */
export function getOrganizationByName(name: string): OrganizationProfile | null {
  const id = nameIndex.get(name.trim().toLowerCase());
  if (!id) return null;
  return organizations.get(id) ?? null;
}

/**
 * List all organizations.
 */
export function listOrganizations(): OrganizationListResult {
  const orgs = Array.from(organizations.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  return { organizations: orgs, total: orgs.length };
}

/**
 * List organizations managed by a specific admin.
 */
export function listOrganizationsByAdmin(
  adminAddress: string,
): OrganizationListResult {
  const orgSet = adminOrgs.get(adminAddress.trim());
  if (!orgSet || orgSet.size === 0) {
    return { organizations: [], total: 0 };
  }

  const orgs = Array.from(orgSet)
    .map((id) => organizations.get(id))
    .filter((o): o is OrganizationProfile => o !== undefined)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { organizations: orgs, total: orgs.length };
}

/**
 * Update an organization profile.
 */
export function updateOrganization(
  orgId: string,
  actor: string,
  updates: {
    name?: string;
    description?: string;
    website?: string;
    contactEmail?: string;
    logoUrl?: string;
  },
  now: Date = new Date(),
): OrgResult<{ organization: OrganizationProfile }> {
  const org = organizations.get(orgId.trim());
  if (!org) {
    return { ok: false, status: 404, error: "Organization not found." };
  }

  if (org.adminAddress !== actor.trim()) {
    return {
      ok: false,
      status: 409,
      error: "Only the organization admin can update the profile.",
    };
  }

  const updated: OrganizationProfile = {
    ...org,
    updatedAt: now.toISOString(),
  };

  if (updates.name !== undefined) {
    const newName = updates.name.trim();
    if (!newName) {
      return { ok: false, status: 400, error: "Name cannot be empty." };
    }
    const lowerNewName = newName.toLowerCase();
    if (lowerNewName !== org.name.toLowerCase() && nameIndex.has(lowerNewName)) {
      return { ok: false, status: 409, error: "An organization with this name already exists." };
    }
    nameIndex.delete(org.name.toLowerCase());
    nameIndex.set(lowerNewName, org.id);
    updated.name = newName;
  }

  if (updates.description !== undefined) {
    updated.description = updates.description.trim();
  }
  if (updates.website !== undefined) {
    updated.website = updates.website.trim();
  }
  if (updates.contactEmail !== undefined) {
    updated.contactEmail = updates.contactEmail.trim();
  }
  if (updates.logoUrl !== undefined) {
    updated.logoUrl = updates.logoUrl.trim();
  }

  organizations.set(org.id, updated);
  return { ok: true, organization: updated };
}

/**
 * Verify an organization (admin/platform action).
 */
export function verifyOrganization(
  orgId: string,
  now: Date = new Date(),
): OrgResult<{ organization: OrganizationProfile }> {
  const org = organizations.get(orgId.trim());
  if (!org) {
    return { ok: false, status: 404, error: "Organization not found." };
  }

  if (org.verified) return { ok: true, organization: org };

  const updated: OrganizationProfile = {
    ...org,
    verified: true,
    updatedAt: now.toISOString(),
  };

  organizations.set(org.id, updated);
  return { ok: true, organization: updated };
}

/**
 * Increment the grant count for an organization.
 * Called when a new task is created with an organization name.
 */
export function incrementGrantCount(orgId: string): void {
  const org = organizations.get(orgId.trim());
  if (org) {
    org.grantCount++;
    organizations.set(org.id, org);
  }
}

/**
 * Decrement the grant count for an organization.
 */
export function decrementGrantCount(orgId: string): void {
  const org = organizations.get(orgId.trim());
  if (org && org.grantCount > 0) {
    org.grantCount--;
    organizations.set(org.id, org);
  }
}

/**
 * Find an organization by name and link a grant to it.
 * Returns the org ID if found, null otherwise.
 */
export function findAndLinkGrant(
  orgName: string,
): string | null {
  const org = getOrganizationByName(orgName);
  if (org) {
    incrementGrantCount(org.id);
    return org.id;
  }
  return null;
}

export function resetOrganizationStore() {
  organizations.clear();
  nameIndex.clear();
  adminOrgs.clear();
  nextOrgId = 1;
}
