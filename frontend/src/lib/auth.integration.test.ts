import { describe, expect, it } from "vitest";

import { createAuthService } from "@/lib/auth";

describe("auth integration flow", () => {
  it("supports successful registration, login, protected access, and logout", () => {
    const auth = createAuthService();

    const user = auth.register("alice@example.com", "super-secret");
    expect(user.email).toBe("alice@example.com");

    const session = auth.login("alice@example.com", "super-secret");
    expect(session).toBeDefined();

    const access = auth.accessProtectedRoute(session.sessionId);
    expect(access.allowed).toBe(true);
    expect(access.user?.email).toBe("alice@example.com");

    expect(auth.logout(session.sessionId)).toBe(true);
    expect(auth.accessProtectedRoute(session.sessionId).allowed).toBe(false);
  });

  it("rejects invalid credentials", () => {
    const auth = createAuthService();

    auth.register("bob@example.com", "correct-horse-battery-staple");

    expect(() => auth.login("bob@example.com", "wrong-password")).toThrow(
      "Invalid credentials",
    );
  });

  it("expires sessions after their time-to-live", () => {
    let now = Date.now();
    const auth = createAuthService({ now: () => now });

    auth.register("carol@example.com", "very-secret");
    const session = auth.login("carol@example.com", "very-secret");

    expect(auth.accessProtectedRoute(session.sessionId).allowed).toBe(true);

    now += 31 * 60 * 1000;

    expect(auth.accessProtectedRoute(session.sessionId).allowed).toBe(false);
    expect(auth.accessProtectedRoute(session.sessionId).reason).toBe(
      "session-expired",
    );
  });

  it("blocks protected routes without an active session", () => {
    const auth = createAuthService();

    const access = auth.accessProtectedRoute("missing-session");

    expect(access.allowed).toBe(false);
    expect(access.reason).toBe("missing-session");
  });
});
