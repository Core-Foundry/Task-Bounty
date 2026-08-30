import type { GrantRecord, GrantStatus } from "@/types/grant";

/**
 * In-memory grant store (mirrors the notification-store pattern).
 * Holds grants users have saved or activated so the reminder engine can
 * sweep them. Expired grants are kept for history but flagged.
 */
const grants = new Map<string, GrantRecord>();
let nextGrantId = 1;

export function createGrant(input: {
  title: string;
  funder: string;
  deadline: number; // Unix seconds
  owner: string;
  status?: GrantStatus;
  now?: Date;
}): GrantRecord {
  const now = input.now ?? new Date();
  const grant: GrantRecord = {
    id: String(nextGrantId++),
    title: input.title.trim(),
    funder: input.funder.trim(),
    deadline: input.deadline,
    status: input.status ?? "active",
    owner: input.owner.trim(),
    createdAt: now.toISOString(),
  };
  grants.set(grant.id, grant);
  return grant;
}

export function getGrant(grantId: string): GrantRecord | undefined {
  return grants.get(grantId);
}

export function listGrants(owner?: string): GrantRecord[] {
  const all = Array.from(grants.values());
  const filtered = owner ? all.filter((g) => g.owner === owner) : all;
  return filtered.sort((a, b) => a.deadline - b.deadline);
}

/**
 * Sweep statuses: mark grants whose deadline has passed as `expired`.
 * Returns the ids that transitioned on this call.
 */
export function expirePastGrants(now: Date = new Date()): string[] {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const expired: string[] = [];
  for (const [id, grant] of grants.entries()) {
    if (grant.status !== "expired" && grant.deadline <= nowSeconds) {
      grants.set(id, { ...grant, status: "expired" });
      expired.push(id);
    }
  }
  return expired;
}

/** Grants that should still be considered by the reminder engine. */
export function listLiveGrants(owner?: string, now: Date = new Date()): GrantRecord[] {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  return listGrants(owner).filter((g) => g.deadline > nowSeconds);
}

export function resetGrantStore(): void {
  grants.clear();
  nextGrantId = 1;
}
