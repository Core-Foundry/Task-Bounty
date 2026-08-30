import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/activities/route";
import { resetActivityStore } from "@/lib/activity-store";

describe("Activities API", () => {
  beforeEach(() => {
    resetActivityStore();
  });

  it("returns 400 if userId query parameter is missing on GET", async () => {
    const req = new Request("http://localhost/api/activities");
    const res = await GET(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain("userId query parameter is required");
  });

  it("returns user activities and seeds default items on GET", async () => {
    const req = new Request("http://localhost/api/activities?userId=user-123");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.activities.length).toBeGreaterThan(0);
    expect(body.total).toBe(body.activities.length);
  });

  it("records a new activity via POST and returns 201", async () => {
    const payload = {
      userId: "user-456",
      type: "grant_saved",
      title: "Saved Grant XYZ",
      description: "Added to saved grants list",
      metadata: { grantId: "grant-xyz" },
    };

    const postReq = new Request("http://localhost/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    expect(postBody.ok).toBe(true);
    expect(postBody.activity.title).toBe("Saved Grant XYZ");
    expect(postBody.activity.userId).toBe("user-456");

    // Fetch and verify it appears first
    const getReq = new Request("http://localhost/api/activities?userId=user-456");
    const getRes = await GET(getReq);
    const getBody = await getRes.json();
    expect(getBody.activities[0].title).toBe("Saved Grant XYZ");
  });

  it("returns 400 for invalid payload on POST", async () => {
    const postReq = new Request("http://localhost/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user-789" }), // Missing type and title
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(400);
  });
});
