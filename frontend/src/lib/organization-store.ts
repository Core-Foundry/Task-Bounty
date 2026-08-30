/**
 * Organization Store
 * 
 * In-memory storage and management for organizations that publish/manage tasks.
 * Follows the same pattern as task-workflow.ts for consistency.
 */

import type { Organization, CreateOrganizationInput } from "@/types/organization";

type OrganizationSuccess<T> = { ok: true } & T;

type OrganizationFailure = {
  ok: false;
  status: 400 | 404 | 409;
  error: string;
  details?: string[];
};

export type OrganizationResult<T> = OrganizationSuccess<T> | OrganizationFailure;

// In-memory storage
const organizations = new Map<string, Organization>();
const organizationsByName = new Map<string, string>(); // name -> id mapping
let nextOrganizationId = 1;

/**
 * Validates organization creation input
 */
function validateCreateOrganizationInput(input: CreateOrganizationInput): string[] {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push("Organization name is required.");
  }

  if (input.name && input.name.trim().length < 2) {
    errors.push("Organization name must be at least 2 characters.");
  }

  if (input.name && input.name.trim().length > 100) {
    errors.push("Organization name must not exceed 100 characters.");
  }

  if (input.website && input.website.trim()) {
    const urlPattern = /^https?:\/\/.+\..+/i;
    if (!urlPattern.test(input.website.trim())) {
      errors.push("Website must be a valid URL (http:// or https://).");
    }
  }

  if (input.description && input.description.trim().length > 500) {
    errors.push("Description must not exceed 500 characters.");
  }

  return errors;
}

/**
 * Creates a new organization.
 */
export function createOrganization(
  input: CreateOrganizationInput,
  now: Date = new Date(),
): OrganizationResult<{ organization: Organization }> {
  const errors = validateCreateOrganizationInput(input);

  if (errors.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Invalid organization data.",
      details: errors,
    };
  }

  const name = input.name.trim();
  const nameLower = name.toLowerCase();

  // Check for duplicate name
  if (organizationsByName.has(nameLower)) {
    return {
      ok: false,
      status: 409,
      error: "An organization with this name already exists.",
    };
  }

  const id = String(nextOrganizationId++);
  const organization: Organization = {
    id,
    name,
    description: input.description?.trim() ?? "",
    website: input.website?.trim() ?? "",
    createdAt: now.toISOString(),
  };

  organizations.set(id, organization);
  organizationsByName.set(nameLower, id);

  return { ok: true, organization };
}

/**
 * Retrieves an organization by ID.
 */
export function getOrganization(
  organizationId: string,
): OrganizationResult<{ organization: Organization }> {
  const organization = organizations.get(organizationId);

  if (!organization) {
    return {
      ok: false,
      status: 404,
      error: "Organization not found.",
    };
  }

  return { ok: true, organization: { ...organization } };
}

/**
 * Retrieves an organization by name (case-insensitive).
 */
export function getOrganizationByName(
  name: string,
): OrganizationResult<{ organization: Organization }> {
  const nameLower = name.trim().toLowerCase();
  const organizationId = organizationsByName.get(nameLower);

  if (!organizationId) {
    return {
      ok: false,
      status: 404,
      error: "Organization not found.",
    };
  }

  return getOrganization(organizationId);
}

/**
 * Lists all organizations.
 */
export function listOrganizations(): Organization[] {
  return Array.from(organizations.values()).map((org) => ({ ...org }));
}

/**
 * Resets the organization store (for testing).
 */
export function resetOrganizationStore(): void {
  organizations.clear();
  organizationsByName.clear();
  nextOrganizationId = 1;
}
