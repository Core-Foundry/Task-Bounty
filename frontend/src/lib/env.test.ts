import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getPublicEnv, looksLikeSensitiveSecret } from "@/lib/env";

describe("getPublicEnv", () => {
  it("returns safe public defaults when env overrides are unset", () => {
    const env = getPublicEnv();

    expect(env.stellarNetwork).toBe("PUBLIC");
    expect(env.horizonUrl).toBe("https://horizon.stellar.org");
    expect(env.sorobanRpcUrl).toBeUndefined();
    expect(env.contractId).toBeUndefined();
  });
});

describe("looksLikeSensitiveSecret", () => {
  it("flags stellar secret keys and ethereum private keys", () => {
    expect(
      looksLikeSensitiveSecret(`S${"A".repeat(55)}`),
    ).toBe(true);
    expect(
      looksLikeSensitiveSecret(
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      ),
    ).toBe(true);
    expect(looksLikeSensitiveSecret("sk-live-abcdefghijklmnopqrstuv")).toBe(true);
  });

  it("allows empty placeholders and public config values", () => {
    expect(looksLikeSensitiveSecret("")).toBe(false);
    expect(looksLikeSensitiveSecret("your_private_key_here")).toBe(false);
    expect(looksLikeSensitiveSecret("https://horizon.stellar.org")).toBe(false);
    expect(looksLikeSensitiveSecret("PUBLIC")).toBe(false);
  });
});

describe(".env.example templates", () => {
  it("do not contain assigned sensitive secrets", () => {
    const files = [
      path.resolve(__dirname, "../../.env.example"),
      path.resolve(__dirname, "../../../.env.example"),
      path.resolve(__dirname, "../../../Documents/Task Bounty/.env.example"),
    ];

    for (const filePath of files) {
      const contents = readFileSync(filePath, "utf8");
      const assignments = contents
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="));

      for (const line of assignments) {
        const value = line.slice(line.indexOf("=") + 1).trim();
        expect(
          looksLikeSensitiveSecret(value),
          `${filePath} has a sensitive-looking value: ${line}`,
        ).toBe(false);
      }
    }
  });
});
