import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/server/auth";

export type PendingGoogleOAuth = {
  nonce: string;
  service: "gmail" | "calendar" | "workspace";
  redirectPath?: string;
  createdAt: number;
};

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  scope: string[];
  expiresAt?: number;
  tokenType?: string;
};

type LocalUserSecrets = {
  google?: string;
  pendingGoogleOAuth?: PendingGoogleOAuth;
};

type LocalSecrets = { users: Record<string, LocalUserSecrets> };

const SECRETS_FILE = path.join(process.cwd(), "data", "relay-secrets.json");
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function encryptionKey() {
  const source = process.env.RELAY_ENCRYPTION_KEY;
  if (!source && process.env.NODE_ENV === "production") {
    throw new Error("RELAY_ENCRYPTION_KEY is required in production.");
  }
  return createHash("sha256").update(source || "relay-local-development-key").digest();
}

export function encryptGoogleTokens(value: GoogleTokens) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptGoogleTokens(value: string): GoogleTokens {
  const [ivPart, tagPart, encryptedPart] = value.split(".");
  if (!ivPart || !tagPart || !encryptedPart) throw new Error("Stored Google credentials are invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as GoogleTokens;
}

async function loadLocalSecrets(): Promise<LocalSecrets> {
  try {
    const parsed = JSON.parse(await readFile(SECRETS_FILE, "utf8")) as Partial<LocalSecrets>;
    return { users: parsed.users ?? {} };
  } catch {
    return { users: {} };
  }
}

async function saveLocalSecrets(secrets: LocalSecrets) {
  await mkdir(path.dirname(SECRETS_FILE), { recursive: true });
  await writeFile(SECRETS_FILE, JSON.stringify(secrets, null, 2), { encoding: "utf8", mode: 0o600 });
}

let localSecretsQueue: Promise<void> = Promise.resolve();

async function mutateLocalSecrets<T>(mutation: (secrets: LocalSecrets) => T | Promise<T>) {
  let result!: T;
  const operation = localSecretsQueue.then(async () => {
    const secrets = await loadLocalSecrets();
    result = await mutation(secrets);
    await saveLocalSecrets(secrets);
  });
  localSecretsQueue = operation.catch(() => undefined);
  await operation;
  return result;
}

export async function savePendingGoogleOAuth(userId: string, pending: PendingGoogleOAuth) {
  if (usesDatabase()) {
    await prisma.googleOAuthState.deleteMany({ where: { userId } });
    await prisma.googleOAuthState.create({
      data: {
        nonce: pending.nonce,
        userId,
        service: pending.service,
        redirectPath: pending.redirectPath,
        expiresAt: new Date(pending.createdAt + OAUTH_STATE_TTL_MS),
      },
    });
    return;
  }
  await mutateLocalSecrets((secrets) => {
    secrets.users[userId] = { ...secrets.users[userId], pendingGoogleOAuth: pending };
  });
}

export async function consumePendingGoogleOAuth(userId: string, nonce: string) {
  if (usesDatabase()) {
    const pending = await prisma.googleOAuthState.findUnique({ where: { nonce } });
    if (!pending || pending.userId !== userId || pending.expiresAt.getTime() <= Date.now()) return null;
    await prisma.googleOAuthState.delete({ where: { nonce } });
    return {
      nonce: pending.nonce,
      service: pending.service as PendingGoogleOAuth["service"],
      redirectPath: pending.redirectPath ?? undefined,
      createdAt: pending.createdAt.getTime(),
    };
  }
  return mutateLocalSecrets((secrets) => {
    const pending = secrets.users[userId]?.pendingGoogleOAuth;
    if (!pending || pending.nonce !== nonce || pending.createdAt + OAUTH_STATE_TTL_MS <= Date.now()) return null;
    delete secrets.users[userId].pendingGoogleOAuth;
    return pending;
  });
}

export async function saveGoogleTokens(userId: string, tokens: GoogleTokens) {
  const encryptedTokens = encryptGoogleTokens(tokens);
  if (usesDatabase()) {
    await prisma.googleConnection.upsert({
      where: { userId },
      create: { userId, encryptedTokens, scopes: tokens.scope, expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null },
      update: { encryptedTokens, scopes: tokens.scope, expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null },
    });
    await prisma.googleOAuthState.deleteMany({ where: { userId } });
    return;
  }
  await mutateLocalSecrets((secrets) => {
    secrets.users[userId] = { ...secrets.users[userId], google: encryptedTokens };
    delete secrets.users[userId].pendingGoogleOAuth;
  });
}

export async function getGoogleTokens(userId: string) {
  if (usesDatabase()) {
    const connection = await prisma.googleConnection.findUnique({ where: { userId } });
    return connection ? decryptGoogleTokens(connection.encryptedTokens) : undefined;
  }
  const secrets = await loadLocalSecrets();
  const encrypted = secrets.users[userId]?.google;
  return encrypted ? decryptGoogleTokens(encrypted) : undefined;
}

export async function clearGoogleTokens(userId: string) {
  if (usesDatabase()) {
    await prisma.googleConnection.deleteMany({ where: { userId } });
    await prisma.googleOAuthState.deleteMany({ where: { userId } });
    return;
  }
  await mutateLocalSecrets((secrets) => {
    delete secrets.users[userId];
  });
}
