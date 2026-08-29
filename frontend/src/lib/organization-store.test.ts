/**
 * Organization Store Tests
 * 
 * Tests organization persistence and task linkage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createOrganization,
  getOrganization,
  getOrganizationByName,
  listOrganizations,
  resetOrganizationStore,
} from "./organization-store";
import {
  createTask,
  listTasks,
  resetTaskWorkflowStore,
} from "./task-workflow";

describe("Organization Store", () => {
  beforeEach(() => {
    resetOrganizationStore();
    resetTaskWorkflowStore();
  });

  describe("Organization Persistence", () => {
    it("creates an organization with required fields", () => {
      const result = createOrganization({
        name: "Stellar Development Foundation",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.organization.id).toBeDefined();
      expect(result.organization.name).toBe("Stellar Development Foundation");
      expect(result.organization.description).toBe("");
      expect(result.organization.website).toBe("");
      expect(result.organization.createdAt).toBeDefined();
    });

    it("creates an organization with all fields", () => {
      const result = createOrganization({
        name: "Soroswap Labs",
        description: "Building the premier DEX on Stellar",
        website: "https://soroswap.finance",
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.organization.name).toBe("Soroswap Labs");
      expect(result.organization.description).toBe("Building the premier DEX on Stellar");
      expect(result.organization.website).toBe("https://soroswap.finance");
    });

    it("retrieves an organization by ID", () => {
      const createResult = createOrganization({
        name: "Blend Protocol",
        description: "Lending on Stellar",
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const getResult = getOrganization(createResult.organization.id);

      expect(getResult.ok).toBe(true);
      if (!getResult.ok) return;

      expect(getResult.organization.id).toBe(createResult.organization.id);
      expect(getResult.organization.name).toBe("Blend Protocol");
    });

    it("retrieves an organization by name (case-insensitive)", () => {
      createOrganization({
        name: "Stellar Foundation",
      });

      const result1 = getOrganizationByName("Stellar Foundation");
      expect(result1.ok).toBe(true);

      const result2 = getOrganizationByName("stellar foundation");
      expect(result2.ok).toBe(true);

      const result3 = getOrganizationByName("STELLAR FOUNDATION");
      expect(result3.ok).toBe(true);
    });

    it("returns error for non-existent organization", () => {
      const result = getOrganization("nonexistent");

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.status).toBe(404);
      expect(result.error).toBe("Organization not found.");
    });

    it("enforces unique organization names (case-insensitive)", () => {
      const result1 = createOrganization({ name: "Unique Org" });
      expect(result1.ok).toBe(true);

      const result2 = createOrganization({ name: "Unique Org" });
      expect(result2.ok).toBe(false);
      if (result2.ok) return;

      expect(result2.status).toBe(409);
      expect(result2.error).toBe("An organization with this name already exists.");

      // Case-insensitive duplicate
      const result3 = createOrganization({ name: "unique org" });
      expect(result3.ok).toBe(false);
    });

    it("validates required organization name", () => {
      const result = createOrganization({ name: "" });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.status).toBe(400);
      expect(result.details).toContain("Organization name is required.");
    });

    it("validates organization name length", () => {
      const result1 = createOrganization({ name: "A" });
      expect(result1.ok).toBe(false);
      if (result1.ok) return;
      expect(result1.details).toContain("Organization name must be at least 2 characters.");

      const result2 = createOrganization({ name: "A".repeat(101) });
      expect(result2.ok).toBe(false);
      if (result2.ok) return;
      expect(result2.details).toContain("Organization name must not exceed 100 characters.");
    });

    it("validates website URL format", () => {
      const result1 = createOrganization({
        name: "Test Org",
        website: "not-a-url",
      });

      expect(result1.ok).toBe(false);
      if (result1.ok) return;
      expect(result1.details).toContain("Website must be a valid URL (http:// or https://).");

      const result2 = createOrganization({
        name: "Test Org 2",
        website: "https://example.com",
      });
      expect(result2.ok).toBe(true);
    });

    it("validates description length", () => {
      const result = createOrganization({
        name: "Test Org",
        description: "A".repeat(501),
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.details).toContain("Description must not exceed 500 characters.");
    });

    it("lists all organizations", () => {
      createOrganization({ name: "Org 1" });
      createOrganization({ name: "Org 2" });
      createOrganization({ name: "Org 3" });

      const orgs = listOrganizations();

      expect(orgs).toHaveLength(3);
      expect(orgs.map((o) => o.name)).toEqual(
        expect.arrayContaining(["Org 1", "Org 2", "Org 3"])
      );
    });

    it("lists empty array when no organizations exist", () => {
      const orgs = listOrganizations();
      expect(orgs).toHaveLength(0);
    });
  });

  describe("Task-Organization Linkage", () => {
    it("creates a task linked to an organization", () => {
      const orgResult = createOrganization({
        name: "TaskBounty DAO",
        description: "Decentralized task marketplace",
      });

      expect(orgResult.ok).toBe(true);
      if (!orgResult.ok) return;

      const taskResult = createTask({
        poster: "GABC123",
        title: "Build a frontend component",
        description: "Create a React component for task listing",
        reward: 10_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 3,
        organizationId: orgResult.organization.id,
      });

      expect(taskResult.ok).toBe(true);
      if (!taskResult.ok) return;

      expect(taskResult.task.organizationId).toBe(orgResult.organization.id);
    });

    it("creates a task without an organization", () => {
      const taskResult = createTask({
        poster: "GXYZ789",
        title: "Independent task",
        description: "Task without organization",
        reward: 5_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 1,
      });

      expect(taskResult.ok).toBe(true);
      if (!taskResult.ok) return;

      expect(taskResult.task.organizationId).toBe("");
    });

    it("filters tasks by organization ID", () => {
      const org1Result = createOrganization({ name: "Org Alpha" });
      const org2Result = createOrganization({ name: "Org Beta" });

      expect(org1Result.ok && org2Result.ok).toBe(true);
      if (!org1Result.ok || !org2Result.ok) return;

      createTask({
        poster: "GTEST1",
        title: "Task 1",
        description: "First task",
        reward: 1_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 1,
        organizationId: org1Result.organization.id,
      });

      createTask({
        poster: "GTEST2",
        title: "Task 2",
        description: "Second task",
        reward: 2_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 1,
        organizationId: org1Result.organization.id,
      });

      createTask({
        poster: "GTEST3",
        title: "Task 3",
        description: "Third task",
        reward: 3_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 1,
        organizationId: org2Result.organization.id,
      });

      const org1Tasks = listTasks({ organizationId: org1Result.organization.id });
      expect(org1Tasks.tasks).toHaveLength(2);
      expect(org1Tasks.tasks.map((t) => t.title)).toEqual(
        expect.arrayContaining(["Task 1", "Task 2"])
      );

      const org2Tasks = listTasks({ organizationId: org2Result.organization.id });
      expect(org2Tasks.tasks).toHaveLength(1);
      expect(org2Tasks.tasks[0].title).toBe("Task 3");
    });

    it("allows multiple tasks per organization", () => {
      const orgResult = createOrganization({ name: "Prolific Org" });
      expect(orgResult.ok).toBe(true);
      if (!orgResult.ok) return;

      const taskCount = 5;
      for (let i = 1; i <= taskCount; i++) {
        const result = createTask({
          poster: `GUSER${i}`,
          title: `Task ${i}`,
          description: `Description ${i}`,
          reward: i * 1_000_000,
          deadline: Math.floor(Date.now() / 1000) + 86400,
          maxSubmissions: 1,
          organizationId: orgResult.organization.id,
        });
        expect(result.ok).toBe(true);
      }

      const tasks = listTasks({ organizationId: orgResult.organization.id });
      expect(tasks.tasks).toHaveLength(taskCount);
    });

    it("lists all tasks for a given organization", () => {
      const orgResult = createOrganization({ name: "Test Organization" });
      expect(orgResult.ok).toBe(true);
      if (!orgResult.ok) return;

      createTask({
        poster: "GPOSTER1",
        title: "Frontend Task",
        description: "Build UI",
        reward: 10_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 2,
        organizationId: orgResult.organization.id,
      });

      createTask({
        poster: "GPOSTER2",
        title: "Backend Task",
        description: "Build API",
        reward: 15_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 1,
        organizationId: orgResult.organization.id,
      });

      createTask({
        poster: "GPOSTER3",
        title: "Unrelated Task",
        description: "Different org",
        reward: 5_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 1,
        organizationId: "",
      });

      const orgTasks = listTasks({ organizationId: orgResult.organization.id });
      expect(orgTasks.tasks).toHaveLength(2);
      expect(orgTasks.tasks.every((t) => t.organizationId === orgResult.organization.id)).toBe(
        true
      );
    });

    it("returns empty list when organization has no tasks", () => {
      const orgResult = createOrganization({ name: "Empty Org" });
      expect(orgResult.ok).toBe(true);
      if (!orgResult.ok) return;

      const tasks = listTasks({ organizationId: orgResult.organization.id });
      expect(tasks.tasks).toHaveLength(0);
    });

    it("handles tasks with non-existent organization ID", () => {
      createTask({
        poster: "GBAD123",
        title: "Orphaned Task",
        description: "Task with invalid org ID",
        reward: 1_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 1,
        organizationId: "nonexistent",
      });

      const tasks = listTasks({ organizationId: "nonexistent" });
      expect(tasks.tasks).toHaveLength(1);
    });
  });

  describe("Organization Query Integration", () => {
    it("combines organization filter with other filters", () => {
      const orgResult = createOrganization({ name: "Filter Test Org" });
      expect(orgResult.ok).toBe(true);
      if (!orgResult.ok) return;

      createTask({
        poster: "GUSER1",
        title: "Low Reward Task",
        description: "Easy task",
        reward: 2_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 1,
        difficulty: "beginner",
        organizationId: orgResult.organization.id,
      });

      createTask({
        poster: "GUSER2",
        title: "High Reward Task",
        description: "Hard task",
        reward: 20_000_000,
        deadline: Math.floor(Date.now() / 1000) + 86400,
        maxSubmissions: 1,
        difficulty: "advanced",
        organizationId: orgResult.organization.id,
      });

      const filtered = listTasks({
        organizationId: orgResult.organization.id,
        minReward: 10_000_000,
      });

      expect(filtered.tasks).toHaveLength(1);
      expect(filtered.tasks[0].title).toBe("High Reward Task");
    });
  });
});
