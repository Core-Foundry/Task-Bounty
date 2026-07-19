export interface HealthReport {
  /** Overall application status. "ok" when the app is able to serve requests. */
  status: "ok";
  /** Name of the service reporting health. */
  service: string;
  /** ISO-8601 timestamp of when the report was generated. */
  timestamp: string;
  /** Seconds the Node.js process has been running, never negative. */
  uptime: number;
  /** Runtime environment (development, production, test). */
  environment: string;
}

export const SERVICE_NAME = "taskbounty-frontend";

/**
 * Builds the health report returned by the /api/health endpoint.
 *
 * `now` and `uptimeSeconds` are injectable so the logic can be tested
 * deterministically; callers normally rely on the defaults.
 */
export function buildHealthReport(
  now: Date = new Date(),
  uptimeSeconds: number = process.uptime(),
): HealthReport {
  const safeNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const safeUptime = Number.isFinite(uptimeSeconds)
    ? Math.max(0, Math.round(uptimeSeconds))
    : 0;

  return {
    status: "ok",
    service: SERVICE_NAME,
    timestamp: safeNow.toISOString(),
    uptime: safeUptime,
    environment: process.env.NODE_ENV ?? "development",
  };
}
