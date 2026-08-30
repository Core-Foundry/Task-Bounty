/**
 * Organization Types
 * 
 * Represents organizations that publish or manage tasks/bounties.
 */

export interface Organization {
  id: string;
  name: string;
  description: string;
  website: string;
  createdAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  description?: string;
  website?: string;
}
