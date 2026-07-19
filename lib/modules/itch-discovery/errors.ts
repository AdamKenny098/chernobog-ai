export class ItchDiscoveryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ItchDiscoveryError";
  }
}

export class ItchDiscoveryDatabaseError extends ItchDiscoveryError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ItchDiscoveryDatabaseError";
  }
}

export class ItchDiscoveryNotFoundError extends ItchDiscoveryError {
  constructor(entity: string, id: string) {
    super(`${entity} was not found: ${id}`);
    this.name = "ItchDiscoveryNotFoundError";
  }
}

export class ItchRssError extends ItchDiscoveryError {
  readonly code: string;
  readonly statusCode?: number;

  constructor(
    message: string,
    options: ErrorOptions & { code?: string; statusCode?: number } = {},
  ) {
    super(message, options);
    this.name = "ItchRssError";
    this.code = options.code ?? "ITCH_RSS_ERROR";
    this.statusCode = options.statusCode;
  }
}

export class ItchRssFetchError extends ItchRssError {
  constructor(
    message: string,
    options: ErrorOptions & { code?: string; statusCode?: number } = {},
  ) {
    super(message, options);
    this.name = "ItchRssFetchError";
  }
}

export class ItchRssBlockedError extends ItchRssFetchError {
  constructor(message: string, statusCode = 403, options?: ErrorOptions) {
    super(message, {
      ...options,
      code: "ITCH_RSS_ACCESS_BLOCKED",
      statusCode,
    });
    this.name = "ItchRssBlockedError";
  }
}

export class ItchRssParseError extends ItchRssError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, { ...options, code: "ITCH_RSS_PARSE_ERROR" });
    this.name = "ItchRssParseError";
  }
}

export class ItchProjectPageError extends ItchDiscoveryError {
  readonly code: string;
  readonly statusCode?: number;

  constructor(
    message: string,
    options: ErrorOptions & { code?: string; statusCode?: number } = {},
  ) {
    super(message, options);
    this.name = "ItchProjectPageError";
    this.code = options.code ?? "ITCH_PROJECT_PAGE_ERROR";
    this.statusCode = options.statusCode;
  }
}

export class ItchProjectPageFetchError extends ItchProjectPageError {
  constructor(
    message: string,
    options: ErrorOptions & { code?: string; statusCode?: number } = {},
  ) {
    super(message, options);
    this.name = "ItchProjectPageFetchError";
  }
}

export class ItchProjectPageBlockedError extends ItchProjectPageFetchError {
  constructor(message: string, statusCode = 403, options?: ErrorOptions) {
    super(message, {
      ...options,
      code: "ITCH_PROJECT_PAGE_ACCESS_BLOCKED",
      statusCode,
    });
    this.name = "ItchProjectPageBlockedError";
  }
}

export class ItchProjectPageParseError extends ItchProjectPageError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, {
      ...options,
      code: "ITCH_PROJECT_PAGE_PARSE_ERROR",
    });
    this.name = "ItchProjectPageParseError";
  }
}

export class ItchFilterValidationError extends ItchDiscoveryError {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid Game Radar filter: ${issues.join("; ")}`);
    this.name = "ItchFilterValidationError";
    this.issues = issues;
  }
}

export class ItchPipelineLockedError extends ItchDiscoveryError {
  readonly lockName: string;
  readonly ownerId: string;
  readonly expiresAt: string;

  constructor(input: { lockName: string; ownerId: string; expiresAt: string }) {
    super(
      `Game Radar operation is already running under ${input.ownerId} until ${input.expiresAt}.`,
    );
    this.name = "ItchPipelineLockedError";
    this.lockName = input.lockName;
    this.ownerId = input.ownerId;
    this.expiresAt = input.expiresAt;
  }
}

export class ItchApiSecurityError extends ItchDiscoveryError {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, options: { code?: string; statusCode?: number } = {}) {
    super(message);
    this.name = "ItchApiSecurityError";
    this.code = options.code ?? "GAME_RADAR_REQUEST_BLOCKED";
    this.statusCode = options.statusCode ?? 403;
  }
}

export class ItchApiRateLimitError extends ItchApiSecurityError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many Game Radar requests. Try again shortly.", {
      code: "GAME_RADAR_RATE_LIMITED",
      statusCode: 429,
    });
    this.name = "ItchApiRateLimitError";
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}
