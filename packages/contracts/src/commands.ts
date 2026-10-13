/** Public command/routing vocabulary shared across Chernobog domains. */
export type RouteName =
  | "chat"
  | "planner"
  | "memory"
  | "tools"
  | "guardian"
  | (string & Record<never, never>);

/**
 * Minimal public command shape.
 *
 * Domain-specific command payloads may extend this interface. Keeping the
 * contract open avoids coupling the shared package to parser implementations.
 */
export interface Command {
  kind: string;
  [key: string]: unknown;
}

/** Public command accepted by the shared routing boundary. */
export type UnifiedCommand = Command;

/** Provider-neutral result returned by a route boundary. */
export interface RouteResult<TValue = unknown> {
  route: RouteName;
  ok: boolean;
  value?: TValue;
  error?: string;
  metadata?: Readonly<Record<string, unknown>>;
}
