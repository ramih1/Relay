#!/usr/bin/env node

import { access, mkdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function parseEnv(source) {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function findConfiguredModel(models, configuredModel) {
  return models.some((model) => model?.name === configuredModel || model?.model === configuredModel);
}

export function evaluateGoogleOAuth(env) {
  const values = [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_OAUTH_REDIRECT_URI];
  const configured = values.every(Boolean);
  const credentialsStarted = Boolean(env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET);
  return { configured, partial: credentialsStarted && !configured };
}

async function loadEnvironment() {
  const envPath = path.join(projectRoot, ".env.local");
  const source = await readFile(envPath, "utf8");
  return { ...parseEnv(source), ...process.env };
}

async function fetchOllamaModels(baseUrl) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/tags`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload.models) ? payload.models : [];
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  console.warn(`⚠ ${message}`);
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

export async function runDemoCheck() {
  try {
    await access(path.join(projectRoot, "node_modules"), constants.R_OK);
  } catch {
    fail("Node dependencies are missing; run pnpm install");
  }

  let env;
  try {
    env = await loadEnvironment();
    pass("Relay environment found");
  } catch {
    fail(".env.local is missing; run cp .env.example .env.local");
    env = process.env;
  }

  try {
    const storagePath = path.join(projectRoot, "data");
    await mkdir(storagePath, { recursive: true });
    await access(storagePath, constants.R_OK | constants.W_OK);
    pass("Local storage available");
  } catch {
    fail("Local data storage is not writable");
  }

  const baseUrl = env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = env.OLLAMA_MODEL || "qwen3:4b";
  try {
    const models = await fetchOllamaModels(baseUrl);
    pass("Ollama connected");
    if (findConfiguredModel(models, model)) pass(`${model} installed`);
    else fail(`${model} is missing; run ollama pull ${model}`);
  } catch {
    fail("Ollama is not reachable; start it with ollama serve");
  }

  const google = evaluateGoogleOAuth(env);
  if (google.configured) pass("Google OAuth configured");
  else if (google.partial) warn("Google OAuth is incomplete; add all three OAuth variables or leave them blank");
  else warn("Google OAuth is not configured; Gmail and Calendar sync will remain local-only");

  if (!process.exitCode) pass("Relay is ready for the demo");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runDemoCheck();
}
