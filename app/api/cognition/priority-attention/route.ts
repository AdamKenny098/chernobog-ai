import {
  NextResponse,
} from "next/server";

import {
  getPriorityAttentionEngine,
  type PlanAttentionPolicy,
  type PlanAttentionProgress,
  type PlanPriorityHint,
  type UserAttentionAvailability,
} from "@chernobog/models/priorityAttentionEngine";

import type {
  CognitivePlan,
} from "@chernobog/models/cognitivePlanningEngine";

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
        plan?:
          CognitivePlan;

        progress?:
          PlanAttentionProgress;

        priorityHints?:
          Record<
            string,
            PlanPriorityHint
          >;

        userAttention?:
          UserAttentionAvailability;

        previousStepId?:
          string;

        policy?:
          Partial<
            PlanAttentionPolicy
          >;
      };

    if (
      !body.plan
    ) {
      throw new Error(
        "plan is required. Run OH-4Q before OH-4R.",
      );
    }

    const decision =
      getPriorityAttentionEngine()
        .prioritize({
          plan:
            body.plan,
          progress:
            body.progress,
          priorityHints:
            body.priorityHints,
          userAttention:
            body.userAttention,
          previousStepId:
            body.previousStepId,
          policy:
            body.policy,
        });

    return NextResponse.json({
      ok:
        true,
      decision,
    });
  } catch (error) {
    return failure(error);
  }
}