export type StellarNetworkName = "PUBLIC" | "TESTNET";

const DEFAULT_HORIZON_URL = "https://horizon.stellar.org";
const DEFAULT_STELLAR_NETWORK: StellarNetworkName = "PUBLIC";

function readPublicEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Public (browser-safe) configuration.
 * Values come from NEXT_PUBLIC_* env vars with safe defaults when unset.
 */
export function getPublicEnv() {
  const networkRaw = readPublicEnv("NEXT_PUBLIC_STELLAR_NETWORK")?.toUpperCase();
  const network: StellarNetworkName =
    networkRaw === "TESTNET" ? "TESTNET" : DEFAULT_STELLAR_NETWORK;

  return {
    stellarNetwork: network,
    horizonUrl: readPublicEnv("NEXT_PUBLIC_HORIZON_URL") ?? DEFAULT_HORIZON_URL,
    sorobanRpcUrl: readPublicEnv("NEXT_PUBLIC_SOROBAN_RPC_URL"),
    contractId: readPublicEnv("NEXT_PUBLIC_CONTRACT_ID"),
  } as const;
}

/**
 * Returns true when a candidate string looks like a secret that must never
 * appear in committed templates or NEXT_PUBLIC_* values.
 */
export function looksLikeSensitiveSecret(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  // Stellar secret keys
  if (/^S[A-Z2-7]{55}$/.test(trimmed)) {
    return true;
  }

  // Ethereum-style private keys
  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return true;
  }

  // Common cloud API key prefixes
  if (/^(sk-|sk_live_|sk_test_|AKIA)[A-Za-z0-9_-]{16,}$/.test(trimmed)) {
    return true;
  }

  return false;
}
