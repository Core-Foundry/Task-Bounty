import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrganization,
  getOrganization,
  getOrganizationByName,
  listOrganizations,
  listOrganizationsByAdmin,
  updateOrganization,
  verifyOrganization,
  incrementGrantCount,
  decrementGrantCount,
  findAndLinkGrant,
  resetOrganizationStore,
} from "@/lib/organization-profile";

describe("organization-profile", () => {
  beforeEach(() => {
    resetOrganizationStore();
  });

  describe("createOrganization", () => {
    it("creates an organization with valid input", () => {
      const result = createOrganization({
        name: "Test Org",
        description: "A test organization",
        adminAddress: "wallet1",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.organization.name).toBe("Test Org");
        expect(result.organization.verified).toBe(false);
        expect(result.organization.grantCount).toBe(0);
      }
    });

    it("returns 400 for empty name", () => {
      const result = createOrganization({
        name: "",
        description: "desc",
        adminAddress: "wallet1",
      });
      expect(result.ok).toBe(false);
    });

    it("returns 400 for empty description", () => {
      const result = createOrganization({
        name: "Org",
        description: "",
        adminAddress: "wallet1",
      });
      expect(result.ok).toBe(false);
    });

    it("returns 400 for empty adminAddress", () => {
      const result = createOrganization({
        name: "Org",
        description: "desc",
        adminAddress: "",
      });
      expect(result.ok).toBe(false);
    });

    it("returns 409 for duplicate name (case-insensitive)", () => {
      createOrganization({ name: "Test Org", description: "desc", adminAddress: "w1" });
      const result = createOrganization({ name: "test org", description: "desc", adminAddress: "w2" });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(409);
    });
  });

  describe("getOrganization", () => {
    it("returns org by ID", () => {
      const create = createOrganization({ name: "Org", description: "desc", adminAddress: "w1" });
      if (create.ok) {
        const org = getOrganization(create.organization.id);
        expect(org).not.toBeNull();
        expect(org!.name).toBe("Org");
      }
    });

    it("returns null for non-existent ID", () => {
      expect(getOrganization("nonexistent")).toBeNull();
    });
  });

  describe("getOrganizationByName", () => {
    it("returns org by name (case-insensitive)", () => {
      createOrganization({ name: "TestOrg", description: "desc", adminAddress: "w1" });
      const org = getOrganizationByName("testorg");
      expect(org).not.toBeNull();
      expect(org!.name).toBe("TestOrg");
    });

    it("returns null for non-existent name", () => {
      expect(getOrganizationByName("nonexistent")).toBeNull();
    });
  });

  describe("listOrganizations", () => {
    it("returns all organizations sorted newest first", () => {
      createOrganization({ name: "Org1", description: "d1", adminAddress: "w1" },
        new Date("2026-01-01"));
      createOrganization({ name: "Org2", description: "d2", adminAddress: "w2" },
        new Date("2026-01-02"));
      const result = listOrganizations();
      expect(result.total).toBe(2);
      expect(result.organizations[0].name).toBe("Org2");
    });
  });

  describe("listOrganizationsByAdmin", () => {
    it("returns orgs for a specific admin", () => {
      createOrganization({ name: "Org1", description: "d1", adminAddress: "w1" });
      createOrganization({ name: "Org2", description: "d2", adminAddress: "w1" });
      createOrganization({ name: "Org3", description: "d3", adminAddress: "w2" });
      const result = listOrganizationsByAdmin("w1");
      expect(result.total).toBe(2);
    });

    it("returns empty for admin with no orgs", () => {
      const result = listOrganizationsByAdmin("nobody");
      expect(result.total).toBe(0);
    });
  });

  describe("updateOrganization", () => {
    it("updates an organization", () => {
      const create = createOrganization({ name: "Org", description: "d", adminAddress: "w1" });
      if (create.ok) {
        const result = updateOrganization(create.organization.id, "w1", {
          description: "Updated desc",
          website: "https://example.com",
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.organization.description).toBe("Updated desc");
          expect(result.organization.website).toBe("https://example.com");
        }
      }
    });

    it("returns 409 for non-admin update", () => {
      const create = createOrganization({ name: "Org", description: "d", adminAddress: "w1" });
      if (create.ok) {
        const result = updateOrganization(create.organization.id, "w2", {
          description: "hacked",
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.status).toBe(409);
      }
    });

    it("returns 404 for non-existent org", () => {
      const result = updateOrganization("nonexistent", "w1", { description: "x" });
      expect(result.ok).toBe(false);
    });
  });

  describe("verifyOrganization", () => {
    it("verifies an organization", () => {
      const create = createOrganization({ name: "Org", description: "d", adminAddress: "w1" });
      if (create.ok) {
        const result = verifyOrganization(create.organization.id);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.organization.verified).toBe(true);
        }
      }
    });

    it("is idempotent", () => {
      const create = createOrganization({ name: "Org", description: "d", adminAddress: "w1" });
      if (create.ok) {
        verifyOrganization(create.organization.id);
        const result = verifyOrganization(create.organization.id);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.organization.verified).toBe(true);
        }
      }
    });
  });

  describe("grantCount", () => {
    it("incrementGrantCount increases the count", () => {
      const create = createOrganization({ name: "Org", description: "d", adminAddress: "w1" });
      if (create.ok) {
        incrementGrantCount(create.organization.id);
        incrementGrantCount(create.organization.id);
        const org = getOrganization(create.organization.id);
        expect(org!.grantCount).toBe(2);
      }
    });

    it("decrementGrantCount decreases the count", () => {
      const create = createOrganization({ name: "Org", description: "d", adminAddress: "w1" });
      if (create.ok) {
        incrementGrantCount(create.organization.id);
        incrementGrantCount(create.organization.id);
        decrementGrantCount(create.organization.id);
        const org = getOrganization(create.organization.id);
        expect(org!.grantCount).toBe(1);
      }
    });

    it("does not go below 0", () => {
      const create = createOrganization({ name: "Org", description: "d", adminAddress: "w1" });
      if (create.ok) {
        decrementGrantCount(create.organization.id);
        const org = getOrganization(create.organization.id);
        expect(org!.grantCount).toBe(0);
      }
    });
  });

  describe("findAndLinkGrant", () => {
    it("finds org by name and increments grant count", () => {
      createOrganization({ name: "TestOrg", description: "d", adminAddress: "w1" });
      const orgId = findAndLinkGrant("testorg");
      expect(orgId).not.toBeNull();
      const org = getOrganization(orgId!);
      expect(org!.grantCount).toBe(1);
    });

    it("returns null for non-existent org", () => {
      expect(findAndLinkGrant("nonexistent")).toBeNull();
    });
  });
});
