import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type PendingGoogleOAuth = {
  nonce: string;
  service: "gmail" | "calendar" | "workspace";
  redirectPath?: string;
  createdAt: number;
};

type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  scope: string[];
  expiresAt?: number;
  tokenType?: string;
};

type RelaySecrets = {
  google?: GoogleTokens;
  pendingGoogleOAuth?: PendingGoogleOAuth;
};

const DATA_DIR = path.join(process.cwd(), "data");
const SECRETS_FILE = path.join(DATA_DIR, "relay-secrets.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function persistSecrets(secrets: RelaySecrets) {
  await ensureDataDir();
  await writeFile(SECRETS_FILE, JSON.stringify(secrets, null, 2), "utf8");
}

export async function loadRelaySecrets(): Promise<RelaySecrets> {
  try {
    const raw = await readFile(SECRETS_FILE, "utf8");
    return JSON.parse(raw) as RelaySecrets;
  } catch {
    return {};
  }
}

export async function savePendingGoogleOAuth(pendingGoogleOAuth: PendingGoogleOAuth) {
  const secrets = await loadRelaySecrets();
  secrets.pendingGoogleOAuth = pendingGoogleOAuth;
  await persistSecrets(secrets);
}

export async function consumePendingGoogleOAuth(nonce: string) {
  const secrets = await loadRelaySecrets();
  const pending = secrets.pendingGoogleOAuth;

  if (!pending || pending.nonce !== nonce) {
    return null;
  }

  delete secrets.pendingGoogleOAuth;
  await persistSecrets(secrets);
  return pending;
}

export async function saveGoogleTokens(tokens: GoogleTokens) {
  const secrets = await loadRelaySecrets();
  secrets.google = tokens;
  delete secrets.pendingGoogleOAuth;
  await persistSecrets(secrets);
}

export async function getGoogleTokens() {
  const secrets = await loadRelaySecrets();
  return secrets.google;
}

export async function clearGoogleTokens() {
  const secrets = await loadRelaySecrets();
  delete secrets.google;
  await persistSecrets(secrets);
}
