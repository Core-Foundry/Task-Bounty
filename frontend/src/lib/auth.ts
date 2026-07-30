export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
};

export type AuthSession = {
  sessionId: string;
  userId: string;
  expiresAt: number;
};

export type ProtectedRouteAccess = {
  allowed: boolean;
  reason?: "missing-session" | "session-expired";
  user?: AuthUser;
};

export type AuthServiceOptions = {
  now?: () => number;
  ttlMs?: number;
};

export function createAuthService(options: AuthServiceOptions = {}) {
  const now = options.now ?? (() => Date.now());
  const ttlMs = options.ttlMs ?? 30 * 60 * 1000;

  const users = new Map<string, AuthUser>();
  const sessions = new Map<string, AuthSession>();

  function hashPassword(password: string) {
    return `hashed:${password}`;
  }

  return {
    register(email: string, password: string) {
      const existing = users.get(email);
      if (existing) {
        throw new Error("User already exists");
      }

      const user: AuthUser = {
        id: `user-${users.size + 1}`,
        email,
        passwordHash: hashPassword(password),
      };

      users.set(email, user);
      return user;
    },

    login(email: string, password: string) {
      const user = users.get(email);
      if (!user || user.passwordHash !== hashPassword(password)) {
        throw new Error("Invalid credentials");
      }

      const sessionId = `session-${Math.random().toString(36).slice(2, 10)}`;
      const session: AuthSession = {
        sessionId,
        userId: user.id,
        expiresAt: now() + ttlMs,
      };

      sessions.set(sessionId, session);
      return session;
    },

    logout(sessionId: string) {
      return sessions.delete(sessionId);
    },

    accessProtectedRoute(sessionId: string): ProtectedRouteAccess {
      const session = sessions.get(sessionId);
      if (!session) {
        return { allowed: false, reason: "missing-session" };
      }

      if (session.expiresAt <= now()) {
        sessions.delete(sessionId);
        return { allowed: false, reason: "session-expired" };
      }

      const user = users.get(
        Array.from(users.values()).find((candidate) => candidate.id === session.userId)?.email ?? "",
      );

      return {
        allowed: true,
        user,
      };
    },
  };
}
