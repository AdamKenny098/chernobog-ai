import {
  ChernobogAttentionQueue,
} from "./attentionQueue";
import {
  ChernobogGoalRegistry,
} from "./goalRegistry";
import {
  DEFAULT_COGNITIVE_FOCUS_POLICY,
  selectCognitiveFocus,
} from "./focusSelector";
import type {
  CognitiveFocusPolicy,
  CognitiveControlSnapshot,
} from "./focusTypes";
import type {
  CognitiveAttentionSignal,
} from "./types";

export interface ChernobogCognitiveControlLoopOptions {
  attention?:
    ChernobogAttentionQueue;
  goals?:
    ChernobogGoalRegistry;
  policy?:
    CognitiveFocusPolicy;
  clock?: () => Date;
}

export class ChernobogCognitiveControlLoop {
  readonly attention:
    ChernobogAttentionQueue;

  readonly goals:
    ChernobogGoalRegistry;

  private readonly policy:
    CognitiveFocusPolicy;

  private readonly clock:
    () => Date;

  private cycleNumber = 0;

  private currentFocusKey?:
    string;

  private lastSnapshot?:
    CognitiveControlSnapshot;

  constructor(
    options:
      ChernobogCognitiveControlLoopOptions = {},
  ) {
    this.attention =
      options.attention ??
      new ChernobogAttentionQueue();

    this.goals =
      options.goals ??
      new ChernobogGoalRegistry();

    this.policy =
      structuredClone(
        options.policy ??
        DEFAULT_COGNITIVE_FOCUS_POLICY,
      );

    this.clock =
      options.clock ??
      (() => new Date());
  }

  get cycle(): number {
    return this.cycleNumber;
  }

  get currentKey():
    | string
    | undefined {
    return this.currentFocusKey;
  }

  get last():
    | CognitiveControlSnapshot
    | undefined {
    return this.lastSnapshot
      ? structuredClone(
          this.lastSnapshot,
        )
      : undefined;
  }

  evaluate(
    signals?:
      readonly CognitiveAttentionSignal[],
  ): CognitiveControlSnapshot {
    const now =
      this.clock();

    const candidates =
      signals
        ? structuredClone(
            signals,
          )
        : this.attention.list();

    const previousKey =
      this.currentFocusKey;

    const selection =
      selectCognitiveFocus(
        candidates,
        this.goals.list({
          activeOnly: true,
        }),
        previousKey,
        this.policy,
      );

    this.cycleNumber += 1;

    this.currentFocusKey =
      selection.selected
        ?.signal.key;

    const snapshot:
      CognitiveControlSnapshot = {
        cycle:
          this.cycleNumber,
        generatedAt:
          now.toISOString(),
        reason:
          selection.reason,
        changed:
          selection.changed,
        previousKey:
          selection.previousKey,
        currentKey:
          this.currentFocusKey,
        selected:
          selection.selected,
        candidates:
          selection.candidates,
      };

    this.lastSnapshot =
      structuredClone(
        snapshot,
      );

    return structuredClone(
      snapshot,
    );
  }

  clearFocus(): void {
    this.currentFocusKey =
      undefined;
  }

  reset(): void {
    this.cycleNumber = 0;
    this.currentFocusKey =
      undefined;
    this.lastSnapshot =
      undefined;
  }
}
