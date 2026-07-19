import {
  ItchApiRateLimitError,
  ItchApiSecurityError,
  ItchDiscoveryNotFoundError,
  ItchFilterValidationError,
  ItchPipelineLockedError,
} from "../errors";

export type ItchApiFailure = {
  status: number;
  body: {
    error: string;
    code: string;
    details?: unknown;
  };
  headers?: Record<string, string>;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonObject(
  request: Request,
  options: { maximumBytes?: number; allowEmpty?: boolean } = {},
): Promise<Record<string, unknown>> {
  const maximumBytes = options.maximumBytes ?? 64_000;
  const contentType = request.headers.get("content-type")?.toLowerCase();
  if (contentType && !contentType.includes("application/json")) {
    throw new TypeError("Request Content-Type must be application/json.");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const parsed = Number.parseInt(contentLength, 10);
    if (Number.isFinite(parsed) && parsed > maximumBytes) {
      throw new TypeError(`Request body cannot exceed ${maximumBytes} bytes.`);
    }
  }

  const text = await readTextBodyWithLimit(request, maximumBytes);
  if (!text.trim()) {
    if (options.allowEmpty) return {};
    throw new TypeError("Request body must contain valid JSON.");
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new TypeError("Request body must contain valid JSON.");
  }

  if (!isRecord(value)) {
    throw new TypeError("Request body must be a JSON object.");
  }

  return value;
}

export function optionalString(
  value: unknown,
  field: string,
  options: { maximumLength?: number } = {},
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string.`);
  const result = sanitizeApiString(value).trim();
  if (!result) return undefined;
  if (options.maximumLength && result.length > options.maximumLength) {
    throw new TypeError(`${field} cannot exceed ${options.maximumLength} characters.`);
  }
  return result;
}

export function requiredString(
  value: unknown,
  field: string,
  options: { maximumLength?: number } = {},
): string {
  const result = optionalString(value, field, options);
  if (!result) throw new TypeError(`${field} is required.`);
  return result;
}

export function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") throw new TypeError(`${field} must be a boolean.`);
  return value;
}

export function optionalInteger(
  value: unknown,
  field: string,
  options: { minimum?: number; maximum?: number } = {},
): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number)) throw new TypeError(`${field} must be an integer.`);
  if (options.minimum !== undefined && number < options.minimum) {
    throw new TypeError(`${field} must be at least ${options.minimum}.`);
  }
  if (options.maximum !== undefined && number > options.maximum) {
    throw new TypeError(`${field} cannot exceed ${options.maximum}.`);
  }
  return number;
}

export function optionalFiniteNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${field} must be a finite number.`);
  return number;
}

export function toItchApiFailure(error: unknown): ItchApiFailure {
  if (error instanceof ItchPipelineLockedError) {
    return {
      status: 409,
      body: {
        error: error.message,
        code: "GAME_RADAR_REFRESH_LOCKED",
        details: {
          lockName: error.lockName,
          ownerId: error.ownerId,
          expiresAt: error.expiresAt,
        },
      },
    };
  }

  if (error instanceof ItchApiRateLimitError) {
    return {
      status: 429,
      body: { error: error.message, code: error.code },
      headers: { "Retry-After": String(error.retryAfterSeconds) },
    };
  }

  if (error instanceof ItchApiSecurityError) {
    return {
      status: error.statusCode,
      body: { error: error.message, code: error.code },
    };
  }

  if (error instanceof ItchDiscoveryNotFoundError) {
    return {
      status: 404,
      body: { error: error.message, code: "GAME_RADAR_NOT_FOUND" },
    };
  }

  if (error instanceof ItchFilterValidationError) {
    return {
      status: 400,
      body: {
        error: error.message,
        code: "GAME_RADAR_FILTER_INVALID",
        details: error.issues,
      },
    };
  }

  if (error instanceof TypeError) {
    return {
      status: 400,
      body: { error: error.message, code: "GAME_RADAR_REQUEST_INVALID" },
    };
  }

  const exposeDetails = process.env.NODE_ENV !== "production";
  return {
    status: 500,
    body: {
      error: exposeDetails && error instanceof Error
        ? error.message
        : "Game Radar encountered an internal error.",
      code: "GAME_RADAR_INTERNAL_ERROR",
    },
  };
}

export function apiFailureResponseInit(failure: ItchApiFailure): ResponseInit {
  return {
    status: failure.status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(failure.headers ?? {}),
    },
  };
}

async function readTextBodyWithLimit(request: Request, maximumBytes: number): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new TypeError(`Request body cannot exceed ${maximumBytes} bytes.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

function sanitizeApiString(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "");
}
