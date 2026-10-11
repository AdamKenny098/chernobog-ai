import {
  NextResponse,
} from "next/server";

import {
  getGatewayCognitiveModelExecutor,
} from "@chernobog/models/multiModelGatewayExecutor";

import {
  MultiModelOrchestrator,
} from "@chernobog/models/multiModelOrchestrator";

import type {
  CompiledPrompt,
} from "@chernobog/models/promptCompiler";

import type {
  ModelRouteDecision,
} from "@chernobog/models/modelDecisionRouter";

import type {
  StrategyRouteDecision,
} from "@chernobog/models/strategyRouter";

import type {
  ReasoningContract,
} from "@chernobog/models/reasoningContracts";

export const runtime =
  "nodejs";

function failure(
  error: unknown,
  status = 400,
) {
  return NextResponse.json(
    {
      ok:
        false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    },
    {
      status,
    },
  );
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json() as {
        compiledPrompt?:
          CompiledPrompt;
        modelRoute?:
          ModelRouteDecision;
        strategyRoute?:
          StrategyRouteDecision;
        reasoningContract?:
          ReasoningContract;

        escalationConfidenceThreshold?:
          number;
        timeoutMs?:
          number;
      };

    if (
      !body.compiledPrompt ||
      !body.modelRoute ||
      !body.strategyRoute ||
      !body.reasoningContract
    ) {
      throw new Error(
        "compiledPrompt, modelRoute, strategyRoute, and reasoningContract are required. Run OH-4L/OH-4M/OH-4N/OH-4O before OH-4S.",
      );
    }

    const orchestrator =
      new MultiModelOrchestrator(
        getGatewayCognitiveModelExecutor(),
      );

    const result =
      await orchestrator
        .orchestrate({
          compiledPrompt:
            body.compiledPrompt,
          modelRoute:
            body.modelRoute,
          strategyRoute:
            body.strategyRoute,
          reasoningContract:
            body.reasoningContract,
          escalationConfidenceThreshold:
            body.escalationConfidenceThreshold,
          timeoutMs:
            body.timeoutMs,
        });

    return NextResponse.json({
      ok:
        true,
      result,
    });
  } catch (error) {
    return failure(error);
  }
}