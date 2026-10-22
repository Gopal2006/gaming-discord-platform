import crypto from "node:crypto";

export function generateCorrelationId(prefix = "req"): string {
  const randomPart = crypto.randomBytes(8).toString("hex");
  return `${prefix}_${Date.now()}_${randomPart}`;
}

export interface SerializedError {
  name: string;
  message: string;
  code?: string;
  stack?: string;
  details?: Record<string, unknown>;
}

export function serializeError(
  error: unknown,
  includeStack = false,
): SerializedError {
  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message,
    };
    if ("code" in error && typeof error.code === "string") {
      serialized.code = error.code;
    }
    if (
      "details" in error &&
      typeof error.details === "object" &&
      error.details !== null
    ) {
      serialized.details = error.details as Record<string, unknown>;
    }
    if (includeStack && error.stack) {
      serialized.stack = error.stack;
    }
    return serialized;
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}
