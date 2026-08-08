import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { AuthUser } from "@/lib/types";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "relay_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AUTH_FILE = path.join(process.cwd(), "data", "relay-auth.json");

type LocalUser = AuthUser & {
  passwordHash: string;
  createdAt: string;
};

type LocalSession = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  lastSeenAt: string;
};

type LocalAuthData = {
  users: LocalUser[];
  sessions: LocalSession[];
};

export class AuthError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "AuthError";
  }
}

export function usesDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function assertProductionDatabase() {
  if (process.env.NODE_ENV === "production" && !usesDatabase() && process.env.ALLOW_FILE_STORAGE !== "1") {
    throw new Error("DATABASE_URL is required in production. Set ALLOW_FILE_STORAGE=1 only for an intentional single-host demo.");
  }
}

async function loadLocalAuth(): Promise<LocalAuthData> {
  try {
    return JSON.parse(await readFile(AUTH_FILE, "utf8")) as LocalAuthData;
  } catch {
    return { users: [], sessions: [] };
  }
}

async function saveLocalAuth(data: LocalAuthData) {
  await mkdir(path.dirname(AUTH_FILE), { recursive: true });
  await writeFile(AUTH_FILE, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
}

let localAuthQueue: Promise<void> = Promise.resolve();

async function mutateLocalAuth<T>(mutation: (data: LocalAuthData) => T | Promise<T>): Promise<T> {
  let result!: T;
  const operation = localAuthQueue.then(async () => {
    const data = await loadLocalAuth();
    result = await mutation(data);
    await saveLocalAuth(data);
  });
  localAuthQueue = operation.catch(() => undefined);
  await operation;
  return result;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validatePassword(password: string) {
  if (password.length < 10 || password.length > 128) {
    throw new AuthError("Use a password between 10 and 128 characters.");
  }
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    throw new AuthError("Password must include at least one letter and one number.");
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [algorithm, saltHex, hashHex] = stored.split(":");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function toAuthUser(user: { id: string; name: string; email: string; role: string }): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (name.length < 2 || name.length > 80) throw new AuthError("Name must be between 2 and 80 characters.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AuthError("Enter a valid email address.");
  validatePassword(input.password);
  const passwordHash = await hashPassword(input.password);

  if (usesDatabase()) {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new AuthError("An account with that email already exists.", 409);
    return toAuthUser(await prisma.user.create({ data: { name, email, passwordHash } }));
  }

  return mutateLocalAuth((data) => {
    if (data.users.some((user) => user.email === email)) throw new AuthError("An account with that email already exists.", 409);
    const user: LocalUser = {
      id: crypto.randomUUID(),
      name,
      email,
      role: "Member",
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    return toAuthUser(user);
  });
}

export async function verifyCredentials(emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  if (usesDatabase()) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AuthError("Email or password is incorrect.", 401);
    }
    return toAuthUser(user);
  }

  const data = await loadLocalAuth();
  const user = data.users.find((candidate) => candidate.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new AuthError("Email or password is incorrect.", 401);
  }
  return toAuthUser(user);
}

export async function updateUserAccount(userId: string, updates: { name?: string; email?: string; role?: string }) {
  const name = updates.name?.trim();
  const email = updates.email ? normalizeEmail(updates.email) : undefined;
  const role = updates.role?.trim();
  if (name !== undefined && (name.length < 2 || name.length > 80)) throw new AuthError("Name must be between 2 and 80 characters.");
  if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) throw new AuthError("Enter a valid email address.");
  if (role !== undefined && (role.length < 2 || role.length > 80)) throw new AuthError("Role must be between 2 and 80 characters.");
  const data = { ...(name ? { name } : {}), ...(email ? { email } : {}), ...(role ? { role } : {}) };

  if (usesDatabase()) {
    try {
      return toAuthUser(await prisma.user.update({ where: { id: userId }, data }));
    } catch (error) {
      if (email && String(error).includes("Unique constraint")) throw new AuthError("That email is already in use.", 409);
      throw error;
    }
  }

  return mutateLocalAuth((local) => {
    const index = local.users.findIndex((user) => user.id === userId);
    if (index < 0) throw new AuthError("Account not found.", 404);
    if (email && local.users.some((user) => user.id !== userId && user.email === email)) throw new AuthError("That email is already in use.", 409);
    local.users[index] = { ...local.users[index], ...data };
    return toAuthUser(local.users[index]);
  });
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const hash = tokenHash(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  if (usesDatabase()) {
    await prisma.session.create({ data: { userId, tokenHash: hash, expiresAt } });
  } else {
    await mutateLocalAuth((data) => {
      data.sessions = data.sessions.filter((session) => new Date(session.expiresAt).getTime() > Date.now());
      data.sessions.push({ tokenHash: hash, userId, expiresAt: expiresAt.toISOString(), lastSeenAt: new Date().toISOString() });
    });
  }

  return { token, expiresAt };
}

function cookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function getRequestUser(request: Request): Promise<AuthUser | null> {
  assertProductionDatabase();
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const hash = tokenHash(token);

  if (usesDatabase()) {
    const session = await prisma.session.findUnique({ where: { tokenHash: hash }, include: { user: true } });
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      return null;
    }
    if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    }
    return toAuthUser(session.user);
  }

  const data = await loadLocalAuth();
  const session = data.sessions.find((candidate) => candidate.tokenHash === hash);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return null;
  const user = data.users.find((candidate) => candidate.id === session.userId);
  return user ? toAuthUser(user) : null;
}

export async function revokeRequestSession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return;
  const hash = tokenHash(token);
  if (usesDatabase()) {
    await prisma.session.deleteMany({ where: { tokenHash: hash } });
    return;
  }
  await mutateLocalAuth((data) => {
    data.sessions = data.sessions.filter((session) => session.tokenHash !== hash);
  });
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export function requireUser(user: AuthUser | null): asserts user is AuthUser {
  if (!user) throw new AuthError("Authentication required.", 401);
}
