import {
  getTaskIntelligenceEngine,
  type TaskDomain,
  type TaskIntelligenceProfile,
  type TaskIntelligenceSignalInput,
} from "./taskIntelligence";

export type InputModality =
  | "typed"
  | "spoken";

export type InterpretedIntentKind =
  | "ask"
  | "plan"
  | "create"
  | "modify"
  | "execute"
  | "continue"
  | "remember"
  | "recall"
  | "discuss"
  | "unknown";

export interface RawHumanInput {
  modality: InputModality;
  text: string;

  turnId?: string;
  receivedAt?: string;
}

export interface InterpretedConstraint {
  kind:
    | "explicit"
    | "inferred";

  text: string;
  sourceText?: string;
}

export interface InterpretedQuestion {
  id: string;
  question: string;
  blocking: boolean;
  reason: string;
}

export interface SemanticInterpretationDraft {
  intentKind?: InterpretedIntentKind;
  goal?: string;
  desiredOutcome?: string;

  explicitConstraints?: string[];
  inferredConstraints?: string[];

  unresolvedQuestions?: Array<
    Omit<
      InterpretedQuestion,
      "id"
    >
  >;

  domains?: TaskDomain[];
  requiredTools?: string[];

  estimatedSteps?: number;
  dependencyCount?: number;
  ambiguityLevel?: number;
  noveltyLevel?: number;

  creativeGeneration?: number;
  styleSensitivity?: number;

  factualVerification?: number;
  evidenceDependency?: number;
  consequenceSeverity?: number;

  reasoningSteps?: number;
  crossDomainReasoning?: boolean;

  containsPersonalData?: boolean;
  containsSecrets?: boolean;
  containsFinancialData?: boolean;
  containsHealthData?: boolean;
  containsCredentials?: boolean;

  requestedLatencyMs?: number;
  canRunAsynchronously?: boolean;

  minimizeCost?: boolean;
  costCeilingRelative?: number;

  confidence?: number;
}

export interface InputInterpretation {
  raw: RawHumanInput;

  normalizedText: string;

  intent: {
    kind: InterpretedIntentKind;
    confidence: number;
  };

  goal: {
    summary: string;
    confidence: number;
  };

  desiredOutcome: {
    summary: string;
    confidence: number;
  };

  constraints: InterpretedConstraint[];

  unresolvedQuestions: InterpretedQuestion[];
  clarificationRequired: boolean;

  completeness: number;
  ambiguity: number;

  taskSignals: TaskIntelligenceSignalInput;
  taskIntelligence: TaskIntelligenceProfile;

  interpretedAt: string;
}

export type InputSemanticAnalyzer =
  (
    input: RawHumanInput,
    normalizedText: string,
  ) =>
    Promise<SemanticInterpretationDraft>
    | SemanticInterpretationDraft;

function clamp01(
  value: number | undefined,
  fallback = 0.5,
): number {
  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    0,
    Math.min(
      1,
      value,
    ),
  );
}

function requireText(
  value: string,
  field: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${field} must not be empty.`,
    );
  }

  return normalized;
}

function uniqueText(
  values:
    readonly string[]
    | undefined,
): string[] {
  return [
    ...new Set(
      (values ?? [])
        .map(
          (value) =>
            value
              .replace(
                /\s+/g,
                " ",
              )
              .trim(),
        )
        .filter(Boolean),
    ),
  ];
}

function normalizeSpokenText(
  value: string,
): string {
  return value
    .replace(
      /\b(?:um+|uh+|erm+|hmm+)\b[,.]?\s*/gi,
      " ",
    )
    .replace(
      /\b(\w+)(?:\s+\1){1,2}\b/gi,
      "$1",
    )
    .replace(
      /\s+([,.!?;:])/g,
      "$1",
    )
    .replace(
      /\s+/g,
      " ",
    )
    .trim();
}

function normalizeTypedText(
  value: string,
): string {
  return value
    .replace(
      /\r\n/g,
      "\n",
    )
    .replace(
      /[ \t]+/g,
      " ",
    )
    .replace(
      /\n{3,}/g,
      "\n\n",
    )
    .trim();
}

export function normalizeHumanInput(
  input: RawHumanInput,
): string {
  const raw =
    requireText(
      input.text,
      "raw input text",
    );

  return input.modality ===
    "spoken"
      ? normalizeSpokenText(
          raw,
        )
      : normalizeTypedText(
          raw,
        );
}

function detectIntentKind(
  text: string,
): InterpretedIntentKind {
  const lower =
    text.toLowerCase();

  if (
    /\b(?:continue|carry on|resume|keep going|pick up)\b/.test(
      lower,
    )
  ) {
    return "continue";
  }

  if (
    /\b(?:remember|save this|keep this in mind)\b/.test(
      lower,
    )
  ) {
    return "remember";
  }

  if (
    /\b(?:what do you remember|recall|do you know|what did i say)\b/.test(
      lower,
    )
  ) {
    return "recall";
  }

  if (
    /\b(?:plan|roadmap|outline|break down|sequence)\b/.test(
      lower,
    )
  ) {
    return "plan";
  }

  if (
    /\b(?:create|build|write|draft|generate|make|design)\b/.test(
      lower,
    )
  ) {
    return "create";
  }

  if (
    /\b(?:change|edit|modify|update|repair|fix|replace|rewrite|refactor)\b/.test(
      lower,
    )
  ) {
    return "modify";
  }

  if (
    /\b(?:run|execute|send|open|delete|deploy|publish|install|apply)\b/.test(
      lower,
    )
  ) {
    return "execute";
  }

  if (
    /^(?:please\s+)?(?:reply|respond|answer|say|return|output|print)\b/i.test(
      text,
    )
  ) {
    return "create";
  }

  if (
    /\?$/.test(
      text,
    ) ||
    /^(?:what|why|how|when|where|who|which|can|could|should|would|is|are|do|does)\b/i.test(
      text,
    )
  ) {
    return "ask";
  }

  if (
    /\b(?:talk about|discuss|thoughts on|tell me about)\b/.test(
      lower,
    )
  ) {
    return "discuss";
  }

  return "unknown";
}

function inferDomains(
  text: string,
  kind: InterpretedIntentKind,
): TaskDomain[] {
  const lower =
    text.toLowerCase();

  const domains:
    TaskDomain[] =
      [];

  const add =
    (
      domain:
        TaskDomain,
      pattern:
        RegExp,
    ) => {
      if (
        pattern.test(
          lower,
        )
      ) {
        domains.push(
          domain,
        );
      }
    };

  add(
    "coding",
    /\b(?:code|typescript|javascript|python|repo|repository|api|function|class|compile|typecheck|bug|refactor|patch)\b/,
  );

  add(
    "research",
    /\b(?:research|investigate|sources?|search|look up|compare evidence|study)\b/,
  );

  add(
    "factual",
    /\b(?:verify|fact|accurate|current|latest|evidence|citation|check whether)\b/,
  );

  add(
    "creative",
    /\b(?:story|chapter|character|fiction|scene|poem|creative|art|image|design|worldbuilding)\b/,
  );

  add(
    "planning",
    /\b(?:plan|roadmap|milestone|schedule|sequence|strategy)\b/,
  );

  add(
    "personal-assistance",
    /\b(?:calendar|email|reminder|appointment|shift|schedule me|my day|my tasks?)\b/,
  );

  add(
    "system-operations",
    /\b(?:deploy|server|service|system|process|install|runtime|restart|terminal|powershell)\b/,
  );

  add(
    "data-analysis",
    /\b(?:analy[sz]e|dataset|spreadsheet|csv|statistics|chart|metrics)\b/,
  );

  if (
    domains.length ===
      0 &&
    kind ===
      "plan"
  ) {
    domains.push(
      "planning",
    );
  }

  if (
    domains.length ===
      0 &&
    (
      kind ===
        "discuss" ||
      kind ===
        "ask"
    )
  ) {
    domains.push(
      "conversation",
    );
  }

  if (
    domains.length ===
    0
  ) {
    domains.push(
      "general",
    );
  }

  return [
    ...new Set(
      domains,
    ),
  ];
}

function inferTools(
  text: string,
): string[] {
  const lower =
    text.toLowerCase();

  const tools:
    string[] =
      [];

  if (
    /\b(?:web|internet|search|look up|latest|current|sources?)\b/.test(
      lower,
    )
  ) {
    tools.push(
      "web",
    );
  }

  if (
    /\b(?:file|document|pdf|spreadsheet|repo|repository|attachment|folder)\b/.test(
      lower,
    )
  ) {
    tools.push(
      "files",
    );
  }

  if (
    /\b(?:calendar|meeting|appointment|schedule)\b/.test(
      lower,
    )
  ) {
    tools.push(
      "calendar",
    );
  }

  if (
    /\b(?:email|e-mail|inbox|mailbox|mail)\b/.test(
      lower,
    )
  ) {
    tools.push(
      "email",
    );
  }

  if (
    /\b(?:run|execute|terminal|powershell|shell|install|typecheck|test suite)\b/.test(
      lower,
    )
  ) {
    tools.push(
      "runtime",
    );
  }

  return [
    ...new Set(
      tools,
    ),
  ].sort();
}

function extractExplicitConstraints(
  text: string,
): string[] {
  const constraints:
    string[] =
      [];

  const patterns = [
    /\b(?:must|must not|don't|do not|only|without|keep|preserve|avoid|never|no)\b[^.!?\n]*/gi,
    /\b(?:under|within|at most|at least)\s+[^.!?\n]*/gi,
    /\bexactly\b[^.!?\n]*/gi,
  ];

  for (
    const pattern
    of patterns
  ) {
    for (
      const match
      of text.matchAll(
        pattern,
      )
    ) {
      const value =
        match[0]
          ?.trim();

      if (value) {
        constraints.push(
          value,
        );
      }
    }
  }

  return uniqueText(
    constraints,
  );
}

function inferAmbiguity(
  text: string,
  kind: InterpretedIntentKind,
): {
  level: number;
  questions:
    Array<
      Omit<
        InterpretedQuestion,
        "id"
      >
    >;
} {
  const lower =
    text.toLowerCase();

  const questions:
    Array<
      Omit<
        InterpretedQuestion,
        "id"
      >
    > =
      [];

  let level =
    0;

  const ambiguousReference =
    /\b(?:it|that|that thing|the thing|this|those|them)\b/.test(
      lower,
    );

  const concreteContext =
    /\b(?:file|document|repo|repository|project|chapter|model|website|book|calendar|email|task|code|function|class|roadmap|milestone)\b/.test(
      lower,
    );

  if (
    ambiguousReference &&
    !concreteContext &&
    text.split(
      /\s+/,
    ).length <=
      12
  ) {
    level =
      Math.max(
        level,
        0.85,
      );

    questions.push({
      question:
        "What specific item or prior subject does the request refer to?",
      blocking:
        kind ===
          "modify" ||
        kind ===
          "execute" ||
        kind ===
          "continue",
      reason:
        "The input contains an unresolved reference without a concrete target.",
    });
  }

  if (
    /(?:\b(?:and|but|because|so|to|the|a|an)\b)\s*[.!?]?$/.test(
      lower,
    )
  ) {
    level =
      Math.max(
        level,
        0.8,
      );

    questions.push({
      question:
        "Was the input cut off before the request was complete?",
      blocking:
        true,
      reason:
        "The utterance ends with a syntactically incomplete connector or article.",
    });
  }

  if (
    kind ===
      "unknown"
  ) {
    level =
      Math.max(
        level,
        0.6,
      );

    questions.push({
      question:
        "What outcome should Chernobog produce from this input?",
      blocking:
        true,
      reason:
        "No clear request type could be determined.",
    });
  }

  return {
    level,
    questions,
  };
}

function estimateSteps(
  text: string,
  kind: InterpretedIntentKind,
): number {
  let steps =
    1;

  const connectors =
    text.match(
      /\b(?:then|after that|next|finally|and then)\b/gi,
    )?.length ??
    0;

  steps +=
    connectors;

  if (
    kind ===
      "plan"
  ) {
    steps =
      Math.max(
        steps,
        3,
      );
  }

  if (
    /\b(?:end[- ]to[- ]end|full|complete|entire|migration|overhaul)\b/i.test(
      text,
    )
  ) {
    steps =
      Math.max(
        steps,
        5,
      );
  }

  return steps;
}

function defaultSemanticAnalyzer(
  input: RawHumanInput,
  normalizedText: string,
): SemanticInterpretationDraft {
  const kind =
    detectIntentKind(
      normalizedText,
    );

  const ambiguity =
    inferAmbiguity(
      normalizedText,
      kind,
    );

  const domains =
    inferDomains(
      normalizedText,
      kind,
    );

  const lower =
    normalizedText.toLowerCase();

  const creative =
    domains.includes(
      "creative",
    )
      ? 0.9
      : /\b(?:write|design|generate|create)\b/.test(
            lower,
          )
        ? 0.45
        : 0.05;

  const style =
    /\b(?:style|voice|tone|aesthetic|match|feel)\b/.test(
      lower,
    )
      ? 0.85
      : creative >
          0.5
        ? 0.5
        : 0.05;

  const factual =
    domains.includes(
      "factual",
    ) ||
    domains.includes(
      "research",
    )
      ? 0.9
      : /\b(?:check|verify|accurate|correct|current|latest)\b/.test(
            lower,
          )
        ? 0.8
        : 0.25;

  const evidence =
    /\b(?:research|sources?|citation|evidence|verify|latest|current)\b/.test(
      lower,
    )
      ? 0.9
      : 0.1;

  const consequence =
    /\b(?:production|deploy|delete|send|publish|payment|security|credentials?|medical|financial)\b/.test(
      lower,
    )
      ? 0.85
      : 0.25;

  const containsCredentials =
    /\b(?:password|api key|secret key|token|credential)\b/.test(
      lower,
    );

  const containsHealthData =
    /\b(?:health|medical|doctor|diagnosis|medication|symptom)\b/.test(
      lower,
    );

  const containsFinancialData =
    /\b(?:bank|card|payment|salary|tax|financial)\b/.test(
      lower,
    );

  const containsPersonalData =
    /\b(?:my calendar|my email|my schedule|my account|my address|my phone|my shift)\b/.test(
      lower,
    );

  const requestedLatencyMs =
    /\b(?:right now|immediately|asap)\b/.test(
      lower,
    )
      ? 1_500
      : /\b(?:quickly|fast|soon)\b/.test(
            lower,
          )
        ? 10_000
        : undefined;

  const minimizeCost =
    /\b(?:free|cheap|cheapest|minimi[sz]e cost|low cost)\b/.test(
      lower,
    );

  return {
    intentKind:
      kind,
    goal:
      normalizedText,
    desiredOutcome:
      normalizedText,
    explicitConstraints:
      extractExplicitConstraints(
        normalizedText,
      ),
    inferredConstraints:
      [],
    unresolvedQuestions:
      ambiguity.questions,
    domains,
    requiredTools:
      inferTools(
        normalizedText,
      ),
    estimatedSteps:
      estimateSteps(
        normalizedText,
        kind,
      ),
    dependencyCount:
      /\b(?:depends on|dependency|blocked by|requires)\b/.test(
        lower,
      )
        ? 1
        : 0,
    ambiguityLevel:
      ambiguity.level,
    noveltyLevel:
      /\b(?:new|novel|first time|unknown|experimental)\b/.test(
        lower,
      )
        ? 0.7
        : 0.25,
    creativeGeneration:
      creative,
    styleSensitivity:
      style,
    factualVerification:
      factual,
    evidenceDependency:
      evidence,
    consequenceSeverity:
      consequence,
    reasoningSteps:
      estimateSteps(
        normalizedText,
        kind,
      ),
    crossDomainReasoning:
      domains.length >
      1,
    containsPersonalData,
    containsSecrets:
      containsCredentials,
    containsFinancialData,
    containsHealthData,
    containsCredentials,
    requestedLatencyMs,
    canRunAsynchronously:
      /\b(?:background|later|overnight|batch)\b/.test(
        lower,
      ),
    minimizeCost,
    costCeilingRelative:
      minimizeCost
        ? 0.1
        : undefined,
    confidence:
      Math.max(
        0.35,
        1 -
          ambiguity.level *
            0.6,
      ),
  };
}

function toConstraintRecords(
  draft:
    SemanticInterpretationDraft,
): InterpretedConstraint[] {
  const explicit =
    uniqueText(
      draft.explicitConstraints,
    ).map(
      (
        text,
      ): InterpretedConstraint => ({
        kind:
          "explicit",
        text,
        sourceText:
          text,
      }),
    );

  const inferred =
    uniqueText(
      draft.inferredConstraints,
    ).map(
      (
        text,
      ): InterpretedConstraint => ({
        kind:
          "inferred",
        text,
      }),
    );

  return [
    ...explicit,
    ...inferred,
  ];
}

function toQuestions(
  draft:
    SemanticInterpretationDraft,
): InterpretedQuestion[] {
  return (
    draft.unresolvedQuestions ??
    []
  ).map(
    (
      question,
      index,
    ) => ({
      id:
        `q-${String(
          index + 1,
        ).padStart(
          2,
          "0",
        )}`,
      question:
        requireText(
          question.question,
          "unresolved question",
        ),
      blocking:
        question.blocking,
      reason:
        requireText(
          question.reason,
          "unresolved question reason",
        ),
    }),
  );
}

function toTaskSignals(
  draft:
    SemanticInterpretationDraft,
): TaskIntelligenceSignalInput {
  return {
    domains:
      draft.domains,
    estimatedSteps:
      draft.estimatedSteps,
    dependencyCount:
      draft.dependencyCount,
    ambiguityLevel:
      draft.ambiguityLevel,
    noveltyLevel:
      draft.noveltyLevel,
    creativeGeneration:
      draft.creativeGeneration,
    styleSensitivity:
      draft.styleSensitivity,
    factualVerification:
      draft.factualVerification,
    evidenceDependency:
      draft.evidenceDependency,
    consequenceSeverity:
      draft.consequenceSeverity,
    reasoningSteps:
      draft.reasoningSteps,
    crossDomainReasoning:
      draft.crossDomainReasoning,
    containsPersonalData:
      draft.containsPersonalData,
    containsSecrets:
      draft.containsSecrets,
    containsFinancialData:
      draft.containsFinancialData,
    containsHealthData:
      draft.containsHealthData,
    containsCredentials:
      draft.containsCredentials,
    requestedLatencyMs:
      draft.requestedLatencyMs,
    canRunAsynchronously:
      draft.canRunAsynchronously,
    minimizeCost:
      draft.minimizeCost,
    costCeilingRelative:
      draft.costCeilingRelative,
    requiredTools:
      draft.requiredTools,
  };
}

export class InputInterpreter {
  constructor(
    private readonly analyzer:
      InputSemanticAnalyzer =
        defaultSemanticAnalyzer,
  ) {}

  async interpret(
    input:
      RawHumanInput,
  ): Promise<InputInterpretation> {
    const normalizedText =
      normalizeHumanInput(
        input,
      );

    const draft =
      await this.analyzer(
        structuredClone(
          input,
        ),
        normalizedText,
      );

    const semanticConfidence =
      clamp01(
        draft.confidence,
        0.6,
      );

    const intentKind =
      draft.intentKind ??
      "unknown";

    const goal =
      draft.goal
        ?.trim() ||
      normalizedText;

    const desiredOutcome =
      draft.desiredOutcome
        ?.trim() ||
      goal;

    const ambiguity =
      clamp01(
        draft.ambiguityLevel,
        intentKind ===
          "unknown"
          ? 0.6
          : 0.25,
      );

    const questions =
      toQuestions(
        draft,
      );

    const clarificationRequired =
      questions.some(
        (question) =>
          question.blocking,
      );

    const constraintRecords =
      toConstraintRecords(
        draft,
      );

    const taskSignals =
      toTaskSignals(
        draft,
      );

    const taskIntelligence =
      getTaskIntelligenceEngine()
        .classify(
          taskSignals,
        );

    const completeness =
      clamp01(
        (
          (
            goal
              ? 1
              : 0
          ) +
          (
            desiredOutcome
              ? 1
              : 0
          ) +
          (
            intentKind !==
              "unknown"
              ? 1
              : 0
          ) +
          (
            clarificationRequired
              ? 0
              : 1
          )
        ) /
          4,
        0,
      );

    return {
      raw:
        structuredClone(
          input,
        ),
      normalizedText,
      intent: {
        kind:
          intentKind,
        confidence:
          semanticConfidence,
      },
      goal: {
        summary:
          goal,
        confidence:
          semanticConfidence,
      },
      desiredOutcome: {
        summary:
          desiredOutcome,
        confidence:
          semanticConfidence,
      },
      constraints:
        constraintRecords,
      unresolvedQuestions:
        questions,
      clarificationRequired,
      completeness,
      ambiguity,
      taskSignals:
        structuredClone(
          taskSignals,
        ),
      taskIntelligence,
      interpretedAt:
        new Date()
          .toISOString(),
    };
  }
}

const defaultInputInterpreter =
  new InputInterpreter();

export function getInputInterpreter():
  InputInterpreter {
  return defaultInputInterpreter;
}