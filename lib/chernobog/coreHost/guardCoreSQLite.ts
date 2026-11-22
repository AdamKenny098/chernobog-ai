/**
 * OH-7B13 core-only SQLite execution fence.
 *
 * Legacy/isolated mode returns the original database instance unchanged.
 * Core mode protects statements, exec, pragma, and transaction execution.
 * This is defense in depth, NOT proof that arbitrary external SQLite handles
 * or file writers cannot bypass the process-local ownership authority.
 */
import type Database from "better-sqlite3";
import { assertStorageWritable } from "./storageAuthority";

export function guardCoreSQLiteConnection(
  connection: Database.Database,
  label: string,
  env: NodeJS.ProcessEnv = process.env,
): Database.Database {
  if (env.CHERNOBOG_STORAGE_ROLE !== "core") return connection;
  const check = () => assertStorageWritable(label, env);
  const guardedStatements = new WeakMap<object, object>();
  const guardStatement = <T extends Database.Statement>(statement: T): T => {
    const cached = guardedStatements.get(statement);
    if (cached) return cached as T;
    const proxy = new Proxy(statement, {
      get(target, key) {
        const value = Reflect.get(target, key, target) as unknown;
        if (typeof value !== "function") return value;
        if (["run", "get", "all", "iterate"].includes(String(key))) {
          return (...args: unknown[]) => {
            if (!target.readonly) check();
            return Reflect.apply(value, target, args) as unknown;
          };
        }
        return value.bind(target);
      },
    });
    guardedStatements.set(statement, proxy);
    return proxy;
  };

  // Transaction methods (.immediate/.deferred/.exclusive) are each guarded
  // on invocation. The callback can still issue SQL only through this proxy.
  const guardTransaction = <T extends (...args: never[]) => unknown>(transaction: T): T => {
    const invoke = (fn: (...args: unknown[]) => unknown) =>
      (...args: unknown[]) => { check(); return fn(...args); };
    const wrapped = invoke(transaction as unknown as (...args: unknown[]) => unknown);
    for (const method of ["immediate", "deferred", "exclusive"] as const) {
      const variant = transaction[method as keyof T];
      if (typeof variant === "function") {
        Object.defineProperty(wrapped, method, {
          value: invoke(variant as (...args: unknown[]) => unknown),
          enumerable: true,
        });
      }
    }
    return wrapped as unknown as T;
  };

  return new Proxy(connection, {
    get(target, key) {
      const value = Reflect.get(target, key, target) as unknown;
      if (key === "prepare") {
        return (sql: string) => guardStatement(target.prepare(sql));
      }
      if (key === "exec") {
        return (sql: string) => { check(); return target.exec(sql); };
      }
      if (key === "pragma") {
        return (...args: Parameters<Database.Database["pragma"]>) => {
          check();
          return target.pragma(...args);
        };
      }
      if (key === "transaction") {
        return <T>(fn: (...args: T[]) => unknown) =>
          guardTransaction(target.transaction(fn));
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Database.Database;
}
