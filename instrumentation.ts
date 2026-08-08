export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL && process.env.ALLOW_FILE_STORAGE !== "1") {
      throw new Error("DATABASE_URL is required in production.");
    }
    if (process.env.NODE_ENV === "production" && !process.env.RELAY_ENCRYPTION_KEY) {
      throw new Error("RELAY_ENCRYPTION_KEY is required in production.");
    }
  }
}

export function onRequestError(error: unknown, request: { path: string }, context: { routeType: string }) {
  console.error(JSON.stringify({
    level: "error",
    event: "request_error",
    path: request.path,
    routeType: context.routeType,
    message: error instanceof Error ? error.message : "Unknown request error",
    timestamp: new Date().toISOString(),
  }));
}
