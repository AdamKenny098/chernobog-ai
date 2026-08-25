import type {
  WorldStateRecord,
} from "../worldState";
import {
  ChernobogAttentionQueue,
} from "./attentionQueue";
import {
  ChernobogCognitiveControlLoop,
} from "./cognitiveControlLoop";
import {
  ChernobogGoalRegistry,
} from "./goalRegistry";
import {
  ChernobogInitiativeMemory,
} from "./initiativeMemory";
import {
  ChernobogInitiativeQueue,
} from "./initiativeQueue";
import {
  decideCognitiveInitiative,
} from "./initiativeDecision";
import {
  decideCognitiveResponse,
} from "./actionDecision";
import {
  ChernobogWorldStateAttention,
} from "./worldStateAttention";
import type {
  CognitiveGovernanceSnapshot,
} from "./actionTypes";
import type {
  ChernobogCognitiveRuntimeOptions,
  CognitiveRuntimeCycle,
  CognitiveRuntimeSnapshot,
} from "./runtimeTypes";

const DEFAULT_ADVISORY_GOVERNANCE:
  CognitiveGovernanceSnapshot = {
    permission: "confirm",
    autonomy: "advisory",
    userInteractionAvailable: true,
  };

function cloneRecord(
  record: WorldStateRecord,
): WorldStateRecord {
  return structuredClone(record);
}

export class ChernobogCognitiveRuntime {
  readonly attentionQueue =
    new ChernobogAttentionQueue();

  readonly goals =
    new ChernobogGoalRegistry();

  readonly initiativeMemory =
    new ChernobogInitiativeMemory();

  readonly deferredInitiative =
    new ChernobogInitiativeQueue();

  readonly attention:
    ChernobogWorldStateAttention;

  readonly control:
    ChernobogCognitiveControlLoop;

  private readonly options:
    ChernobogCognitiveRuntimeOptions;

  private readonly previousState =
    new Map<
      string,
      WorldStateRecord
    >();

  private lastCycle?:
    CognitiveRuntimeCycle;

  constructor(
    options:
      ChernobogCognitiveRuntimeOptions,
  ) {
    this.options = options;

    this.attention =
      new ChernobogWorldStateAttention({
        queue:
          this.attentionQueue,
        clock:
          options.clock,
      });

    this.control =
      new ChernobogCognitiveControlLoop({
        attention:
          this.attentionQueue,
        goals:
          this.goals,
        clock:
          options.clock,
      });
  }

  async evaluate():
    Promise<CognitiveRuntimeCycle> {
    const now =
      this.options.clock?.() ??
      new Date();

    const records =
      await this.options
        .readWorldState();

    const ordered =
      [...records].sort(
        (left, right) =>
          left.key.localeCompare(
            right.key,
          ),
      );

    for (
      const record
      of ordered
    ) {
      const previous =
        this.previousState.get(
          record.key,
        );

      this.attention.observe(
        record,
        previous,
      );

      this.previousState.set(
        record.key,
        cloneRecord(record),
      );
    }

    const focus =
      this.control.evaluate();

    const opportunity =
      await this.options
        .resolveOpportunity?.(
          focus,
        );

    const governance =
      this.options
        .resolveGovernance
        ? await this.options
            .resolveGovernance(
              focus,
              opportunity,
            )
        : structuredClone(
            DEFAULT_ADVISORY_GOVERNANCE,
          );

    const action =
      decideCognitiveResponse(
        {
          focus,
          opportunity,
          governance,
        },
        now,
      );

    const userAttention =
      this.options
        .resolveUserAttention
        ? await this.options
            .resolveUserAttention()
        : "available";

    const initiative =
      decideCognitiveInitiative(
        {
          decision:
            action,
          userAttention,
        },
        {
          memory:
            this.initiativeMemory,
          now,
        },
      );

    this.deferredInitiative.enqueue(
      initiative,
    );

    const cycle:
      CognitiveRuntimeCycle = {
        cycle:
          focus.cycle,
        generatedAt:
          now.toISOString(),
        observedRecords:
          ordered.length,
        focus,
        action,
        initiative,
      };

    this.lastCycle =
      structuredClone(cycle);

    return structuredClone(
      cycle,
    );
  }

  snapshot():
    CognitiveRuntimeSnapshot {
    const now =
      this.options.clock?.() ??
      new Date();

    return {
      generatedAt:
        now.toISOString(),
      cycle:
        this.control.cycle,
      activeGoals:
        this.goals.list({
          activeOnly: true,
        }),
      attention:
        this.attentionQueue.list(),
      deferredInitiative:
        this.deferredInitiative.list(),
      lastCycle:
        this.lastCycle
          ? structuredClone(
              this.lastCycle,
            )
          : undefined,
    };
  }

  resetWorkingState(): void {
    this.previousState.clear();
    this.attentionQueue.clear();
    this.initiativeMemory.clear();
    this.deferredInitiative.clear();
    this.control.reset();
    this.lastCycle =
      undefined;
  }
}

export {
  DEFAULT_ADVISORY_GOVERNANCE,
};
