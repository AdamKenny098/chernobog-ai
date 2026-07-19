import { randomUUID } from "node:crypto";

export function createItchId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function toSqliteBoolean(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}

export function fromSqliteBoolean(value: number): boolean {
  return value === 1;
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
