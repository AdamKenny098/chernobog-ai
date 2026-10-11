import type {
  LLMGatewayOptions,
  LLMProvider,
  LLMProviderId,
  LLMRequest,
  LLMResult,
} from "./types";

function normalizeProviderId(
  value: string,
): string {
  return value.trim().toLowerCase();
}

function invalidRequest(
  provider: string,
  request: LLMRequest,
  error: string,
): LLMResult {
  return {
    ok: false,
    provider,
    model:
      request.model?.trim() ||
      "unresolved",
    role:
      request.role ??
      "default",
    failureKind:
      "invalid-request",
    error,
  };
}

function validateRequest(
  provider: string,
  request: LLMRequest,
): LLMResult | undefined {
  const prompt =
    request.prompt?.trim();

  const messages =
    request.messages;

  if (
    prompt &&
    messages &&
    messages.length > 0
  ) {
    return invalidRequest(
      provider,
      request,
      "LLM request must use either prompt or messages, not both.",
    );
  }

  if (
    !prompt &&
    (!messages || messages.length === 0)
  ) {
    return invalidRequest(
      provider,
      request,
      "LLM request requires a prompt or at least one message.",
    );
  }

  if (
    messages?.some(
      (message) =>
        !message.content.trim(),
    )
  ) {
    return invalidRequest(
      provider,
      request,
      "LLM message content must not be empty.",
    );
  }

  if (
    request.temperature !==
      undefined &&
    !Number.isFinite(
      request.temperature,
    )
  ) {
    return invalidRequest(
      provider,
      request,
      "LLM temperature must be finite.",
    );
  }

  if (
    request.timeoutMs !==
      undefined &&
    (
      !Number.isFinite(
        request.timeoutMs,
      ) ||
      request.timeoutMs <= 0
    )
  ) {
    return invalidRequest(
      provider,
      request,
      "LLM timeoutMs must be greater than zero.",
    );
  }

  if (
    request.numPredict !==
      undefined &&
    (
      !Number.isInteger(
        request.numPredict,
      ) ||
      request.numPredict < 1
    )
  ) {
    return invalidRequest(
      provider,
      request,
      "LLM numPredict must be a positive integer.",
    );
  }

  return undefined;
}

export class UnifiedLLMGateway {
  private readonly providers =
    new Map<
      LLMProviderId,
      LLMProvider
    >();

  private defaultProvider:
    LLMProviderId;

  constructor(
    options: LLMGatewayOptions,
  ) {
    this.defaultProvider =
      normalizeProviderId(
        options.defaultProvider,
      );

    for (
      const provider
      of options.providers
    ) {
      this.registerProvider(
        provider,
      );
    }

    if (
      !this.providers.has(
        this.defaultProvider,
      )
    ) {
      throw new Error(
        `Default LLM provider is not registered: ${this.defaultProvider}`,
      );
    }
  }

  registerProvider(
    provider: LLMProvider,
  ): void {
    const id =
      normalizeProviderId(
        provider.id,
      );

    if (!id) {
      throw new Error(
        "LLM provider id must not be empty.",
      );
    }

    this.providers.set(
      id,
      provider,
    );
  }

  hasProvider(
    providerId: LLMProviderId,
  ): boolean {
    return this.providers.has(
      normalizeProviderId(
        providerId,
      ),
    );
  }

  listProviderIds():
    LLMProviderId[] {
    return [
      ...this.providers.keys(),
    ].sort();
  }

  getDefaultProviderId():
    LLMProviderId {
    return this.defaultProvider;
  }

  setDefaultProvider(
    providerId: LLMProviderId,
  ): void {
    const normalized =
      normalizeProviderId(
        providerId,
      );

    if (
      !this.providers.has(
        normalized,
      )
    ) {
      throw new Error(
        `Cannot select unregistered LLM provider: ${normalized}`,
      );
    }

    this.defaultProvider =
      normalized;
  }

  async generate(
    request: LLMRequest,
  ): Promise<LLMResult> {
    const providerId =
      normalizeProviderId(
        request.provider ??
        this.defaultProvider,
      );

    const validation =
      validateRequest(
        providerId,
        request,
      );

    if (validation) {
      return validation;
    }

    const provider =
      this.providers.get(
        providerId,
      );

    if (!provider) {
      return {
        ok: false,
        provider:
          providerId,
        model:
          request.model?.trim() ||
          "unresolved",
        role:
          request.role ??
          "default",
        failureKind:
          "provider-unavailable",
        error:
          `LLM provider is not registered: ${providerId}`,
      };
    }

    try {
      const result =
        await provider.generate({
          ...request,
          provider:
            providerId,
        });

      return {
        ...result,
        provider:
          providerId,
      };
    } catch (error) {
      return {
        ok: false,
        provider:
          providerId,
        model:
          request.model?.trim() ||
          "unresolved",
        role:
          request.role ??
          "default",
        failureKind:
          "provider-error",
        error:
          error instanceof Error
            ? error.message
            : "LLM provider failed.",
      };
    }
  }
}

export function createLLMGateway(
  options: LLMGatewayOptions,
): UnifiedLLMGateway {
  return new UnifiedLLMGateway(
    options,
  );
}