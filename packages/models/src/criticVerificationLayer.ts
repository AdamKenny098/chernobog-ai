import type {
  ModelRoutingCandidate,
} from "./modelDecisionRouter";

import type {
  CognitiveModelExecutor,
  MultiModelOrchestrationResult,
} from "./multiModelOrchestrator";

import type {
  ReasoningContract,
} from "./reasoningContracts";

export const CRITIC_VERIFICATION_LAYER_VERSION =
  "oh4t.v1";

export type VerificationVerdict =
  | "pass"
  | "revise"
  | "reject"
  | "blocked";

export type VerificationFindingSeverity =
  | "info"
  | "warning"
  | "error";

export type VerificationFindingSource =
  | "deterministic"
  | "contract"
  | "independent-critic";

export interface VerificationFinding {
  code: string;

  severity:
    VerificationFindingSeverity;

  source:
    VerificationFindingSource;

  message: string;

  evidenceRef?: string;
}

export interface DeterministicVerificationCheck {
  id: string;
  name: string;

  passed: boolean;

  detail?: string;
  evidenceRef?: string;
}

export interface ConstraintVerificationCheck {
  id: string;
  constraint: string;

  passed: boolean;

  detail?: string;
}

export interface FactualVerificationCheck {
  id: string;

  claim?: string;

  passed: boolean;

  detail?: string;
  sourceRef?: string;
}

export interface VerificationEvidenceReference {
  id: string;
  sourceRef: string;

  freshness?:
    | "fresh"
    | "aging"
    | "stale"
    | "unknown";

  confidence?: number;
}

export interface VerificationEvidenceBundle {
  deterministicTests?:
    DeterministicVerificationCheck[];

  constraintChecks?:
    ConstraintVerificationCheck[];

  factualChecks?:
    FactualVerificationCheck[];

  evidenceReferences?:
    VerificationEvidenceReference[];
}

export interface IndependentCriticResult {
  verdict:
    Exclude<
      VerificationVerdict,
      "blocked"
    >;

  summary: string;

  findings:
    Array<{
      code: string;
      severity:
        VerificationFindingSeverity;
      message: string;
    }>;
}

export interface CriticVerificationResult {
  version: string;

  startedAt: string;
  completedAt: string;

  verdict:
    VerificationVerdict;

  trustedConclusion:
    boolean;

  orchestrationStatus:
    MultiModelOrchestrationResult[
      "status"
    ];

  finalSourceRunId?:
    string;

  findings:
    VerificationFinding[];

  deterministic: {
    checksRun: number;
    checksPassed: number;
    checksFailed: number;

    constraintChecksRun:
      number;
    factualChecksRun:
      number;

    evidenceReferenceCount:
      number;
  };

  independentCritic: {
    required: boolean;
    attempted: boolean;

    candidateId?: string;

    independentFromFinalSource:
      boolean;

    parsed: boolean;

    verdict?:
      IndependentCriticResult[
        "verdict"
      ];

    summary?: string;
  };

  provenance: {
    reasoningContractVersion:
      string;
    orchestratorVersion:
      string;
    criticLayerVersion:
      string;
  };

  invariants: {
    toolsExecuted: false;
    actionsExecuted: false;
    authorityBypassed: false;
    resultRewritten: false;
    hiddenScratchReasoningRequested: false;
    hiddenScratchReasoningPersisted: false;
  };

  warnings: string[];
}

function clamp01(
  value:
    number
    | undefined,
): number | undefined {
  if (
    value ===
    undefined
  ) {
    return undefined;
  }

  if (
    !Number.isFinite(
      value,
    ) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "Verification evidence confidence must be between 0 and 1.",
    );
  }

  return value;
}

function criticRequired(
  contract:
    ReasoningContract,
): boolean {
  return (
    contract.validation
      .mode ===
      "critic" ||
    contract.validation
      .mode ===
      "comparison"
  );
}

function finalSourceCandidateId(
  orchestration:
    MultiModelOrchestrationResult,
): string | undefined {
  if (
    !orchestration
      .finalSourceRunId
  ) {
    return undefined;
  }

  return orchestration.runs
    .find(
      (run) =>
        run.id ===
        orchestration
          .finalSourceRunId,
    )
    ?.candidateId;
}

function addFinding(
  findings:
    VerificationFinding[],
  finding:
    VerificationFinding,
): void {
  findings.push(
    finding,
  );
}

function deterministicChecks(
  input: {
    orchestration:
      MultiModelOrchestrationResult;
    contract:
      ReasoningContract;
    evidence:
      VerificationEvidenceBundle;
  },
  findings:
    VerificationFinding[],
): void {
  const {
    orchestration,
    contract,
    evidence,
  } =
    input;

  if (
    orchestration.status ===
      "blocked"
  ) {
    addFinding(
      findings,
      {
        code:
          "orchestration-blocked",
        severity:
          "error",
        source:
          "deterministic",
        message:
          "OH-4S orchestration is blocked and cannot be accepted as a trusted conclusion.",
      },
    );
  }

  if (
    orchestration.status ===
      "failed"
  ) {
    addFinding(
      findings,
      {
        code:
          "orchestration-failed",
        severity:
          "error",
        source:
          "deterministic",
        message:
          "OH-4S orchestration failed and produced no acceptable trusted conclusion.",
      },
    );
  }

  if (
    orchestration.status ===
      "partial"
  ) {
    addFinding(
      findings,
      {
        code:
          "orchestration-partial",
        severity:
          "warning",
        source:
          "deterministic",
        message:
          "OH-4S returned a partial result; further verification or revision is required before trust.",
      },
    );
  }

  if (
    !orchestration.finalText
      ?.trim()
  ) {
    addFinding(
      findings,
      {
        code:
          "missing-final-output",
        severity:
          "error",
        source:
          "deterministic",
        message:
          "No non-empty final output exists to verify.",
      },
    );
  }

  for (
    const test
    of evidence
      .deterministicTests ??
    []
  ) {
    if (
      !test.passed
    ) {
      addFinding(
        findings,
        {
          code:
            `deterministic-test:${test.id}`,
          severity:
            "error",
          source:
            "deterministic",
          message:
            `${test.name} failed${test.detail ? `: ${test.detail}` : "."}`,
          evidenceRef:
            test.evidenceRef,
        },
      );
    }
  }

  for (
    const check
    of evidence
      .constraintChecks ??
    []
  ) {
    if (
      !check.passed
    ) {
      addFinding(
        findings,
        {
          code:
            `constraint:${check.id}`,
          severity:
            "error",
          source:
            "contract",
          message:
            `Constraint failed: ${check.constraint}${check.detail ? ` (${check.detail})` : ""}`,
        },
      );
    }
  }

  for (
    const check
    of evidence
      .factualChecks ??
    []
  ) {
    if (
      !check.passed
    ) {
      addFinding(
        findings,
        {
          code:
            `factual:${check.id}`,
          severity:
            "error",
          source:
            "deterministic",
          message:
            `Factual verification failed${check.claim ? ` for "${check.claim}"` : ""}${check.detail ? `: ${check.detail}` : "."}`,
          evidenceRef:
            check.sourceRef,
        },
      );
    }
  }

  const references =
    evidence
      .evidenceReferences ??
    [];

  for (
    const reference
    of references
  ) {
    clamp01(
      reference.confidence,
    );

    if (
      reference.freshness ===
        "stale"
    ) {
      addFinding(
        findings,
        {
          code:
            `stale-evidence:${reference.id}`,
          severity:
            "warning",
          source:
            "deterministic",
          message:
            `Evidence reference ${reference.id} is stale.`,
          evidenceRef:
            reference.sourceRef,
        },
      );
    }
  }

  if (
    contract.result
      .requireEvidenceReferences &&
    references.length ===
      0
  ) {
    addFinding(
      findings,
      {
        code:
          "missing-evidence-references",
        severity:
          "warning",
        source:
          "contract",
        message:
          "The active reasoning contract requires evidence references, but no verification evidence references were supplied.",
      },
    );
  }

  if (
    contract.validation
      .validateConstraints &&
    (
      evidence
        .constraintChecks ??
      []
    ).length ===
      0
  ) {
    addFinding(
      findings,
      {
        code:
          "constraint-coverage-missing",
        severity:
          "warning",
        source:
          "contract",
        message:
          "Constraint validation is required by the reasoning contract, but no explicit constraint checks were supplied.",
      },
    );
  }

  if (
    contract.validation
      .validateFactuality &&
    (
      evidence
        .factualChecks ??
      []
    ).length ===
      0
  ) {
    addFinding(
      findings,
      {
        code:
          "factual-coverage-missing",
        severity:
          "warning",
        source:
          "contract",
        message:
          "Factuality validation is required by the reasoning contract, but no explicit factual checks were supplied.",
      },
    );
  }
}

function extractJsonObject(
  text: string,
): string {
  const trimmed =
    text.trim();

  const fence =
    trimmed.match(
      /^```(?:json)?\s*([\s\S]*?)\s*```$/i,
    );

  const candidate =
    fence
      ? fence[1].trim()
      : trimmed;

  const start =
    candidate.indexOf(
      "{",
    );

  const end =
    candidate.lastIndexOf(
      "}",
    );

  if (
    start <
      0 ||
    end <
      start
  ) {
    throw new Error(
      "Independent critic did not return a JSON object.",
    );
  }

  return candidate.slice(
    start,
    end +
      1,
  );
}

function parseIndependentCritic(
  text: string,
): IndependentCriticResult {
  const parsed =
    JSON.parse(
      extractJsonObject(
        text,
      ),
    ) as {
      verdict?:
        unknown;
      summary?:
        unknown;
      findings?:
        unknown;
    };

  if (
    parsed.verdict !==
      "pass" &&
    parsed.verdict !==
      "revise" &&
    parsed.verdict !==
      "reject"
  ) {
    throw new Error(
      "Independent critic verdict must be pass, revise, or reject.",
    );
  }

  if (
    typeof parsed.summary !==
      "string" ||
    !parsed.summary.trim()
  ) {
    throw new Error(
      "Independent critic summary must be a non-empty string.",
    );
  }

  if (
    !Array.isArray(
      parsed.findings,
    )
  ) {
    throw new Error(
      "Independent critic findings must be an array.",
    );
  }

  const findings =
    parsed.findings
      .map(
        (
          item,
          index,
        ) => {
          if (
            !item ||
            typeof item !==
              "object"
          ) {
            throw new Error(
              `Independent critic finding ${index + 1} is invalid.`,
            );
          }

          const record =
            item as Record<
              string,
              unknown
            >;

          const rawSeverity =
            record.severity;

          if (
            rawSeverity !==
              "info" &&
            rawSeverity !==
              "warning" &&
            rawSeverity !==
              "error"
          ) {
            throw new Error(
              `Independent critic finding ${index + 1} has invalid severity.`,
            );
          }

          const severity:
            VerificationFindingSeverity =
              rawSeverity;

          if (
            typeof record.code !==
              "string" ||
            !record.code.trim() ||
            typeof record.message !==
              "string" ||
            !record.message.trim()
          ) {
            throw new Error(
              `Independent critic finding ${index + 1} must have non-empty code and message.`,
            );
          }

          return {
            code:
              record.code.trim(),
            severity,
            message:
              record.message.trim(),
          };
        },
      );

  return {
    verdict:
      parsed.verdict,
    summary:
      parsed.summary.trim(),
    findings,
  };
}

function criticPrompt(
  input: {
    orchestration:
      MultiModelOrchestrationResult;
    contract:
      ReasoningContract;
    evidence:
      VerificationEvidenceBundle;
  },
): string {
  const deterministicSummary = {
    deterministicTests:
      input.evidence
        .deterministicTests ??
      [],
    constraintChecks:
      input.evidence
        .constraintChecks ??
      [],
    factualChecks:
      input.evidence
        .factualChecks ??
      [],
    evidenceReferences:
      input.evidence
        .evidenceReferences ??
      [],
  };

  return [
    "You are an independent verification critic.",
    "Judge the candidate output against the stated task contract and supplied verification evidence.",
    "Do not rewrite the answer.",
    "Do not claim tool execution or external evidence that is not supplied.",
    "Do not reveal, request, or reconstruct hidden chain-of-thought.",
    "",
    "Return ONLY JSON matching:",
    '{"verdict":"pass|revise|reject","summary":"brief verification summary","findings":[{"code":"short-code","severity":"info|warning|error","message":"specific finding"}]}',
    "",
    "TASK GOAL:",
    input.contract.goal,
    "",
    "DESIRED OUTCOME:",
    input.contract.desiredOutcome,
    "",
    "STRATEGY:",
    input.contract.strategy,
    "",
    "VALIDATION MODE:",
    input.contract.validation.mode,
    "",
    "EVIDENCE REQUIREMENT:",
    input.contract.evidence.requirement,
    "",
    "DETERMINISTIC VERIFICATION CONTEXT:",
    JSON.stringify(
      deterministicSummary,
      null,
      2,
    ),
    "",
    "CANDIDATE OUTPUT:",
    input.orchestration
      .finalText ??
    "",
  ].join(
    "\n",
  );
}

function verdictFromFindings(
  findings:
    readonly VerificationFinding[],
): VerificationVerdict {
  const errors =
    findings.filter(
      (finding) =>
        finding.severity ===
        "error",
    );

  if (
    errors.some(
      (finding) =>
        finding.code ===
          "orchestration-blocked"
    )
  ) {
    return "blocked";
  }

  if (
    errors.some(
      (finding) =>
        finding.code ===
          "orchestration-failed" ||
        finding.code ===
          "missing-final-output" ||
        finding.code.startsWith(
          "deterministic-test:",
        ) ||
        finding.code.startsWith(
          "constraint:",
        ) ||
        finding.code.startsWith(
          "factual:",
        )
    )
  ) {
    return "reject";
  }

  if (
    findings.some(
      (finding) =>
        finding.severity ===
          "warning"
    )
  ) {
    return "revise";
  }

  return "pass";
}

function mergeVerdict(
  deterministic:
    VerificationVerdict,
  critic:
    IndependentCriticResult[
      "verdict"
    ],
): VerificationVerdict {
  if (
    deterministic ===
      "blocked"
  ) {
    return "blocked";
  }

  if (
    deterministic ===
      "reject" ||
    critic ===
      "reject"
  ) {
    return "reject";
  }

  if (
    deterministic ===
      "revise" ||
    critic ===
      "revise"
  ) {
    return "revise";
  }

  return "pass";
}

export class CriticVerificationLayer {
  constructor(
    private readonly executor?:
      CognitiveModelExecutor,
  ) {}

  async verify(
    input: {
      orchestration:
        MultiModelOrchestrationResult;

      reasoningContract:
        ReasoningContract;

      evidence?:
        VerificationEvidenceBundle;

      criticCandidate?:
        ModelRoutingCandidate;

      requireIndependentCritic?:
        boolean;

      timeoutMs?:
        number;
    },
  ): Promise<CriticVerificationResult> {
    const startedAt =
      new Date()
        .toISOString();

    const evidence =
      structuredClone(
        input.evidence ??
        {},
      );

    const findings:
      VerificationFinding[] =
        [];

    const warnings:
      string[] =
        [];

    deterministicChecks(
      {
        orchestration:
          input.orchestration,
        contract:
          input.reasoningContract,
        evidence,
      },
      findings,
    );

    let deterministicVerdict =
      verdictFromFindings(
        findings,
      );

    const independentRequired =
      input.requireIndependentCritic ??
      criticRequired(
        input
          .reasoningContract,
      );

    const sourceCandidateId =
      finalSourceCandidateId(
        input.orchestration,
      );

    let independentAttempted =
      false;

    let independentParsed =
      false;

    let independentResult:
      IndependentCriticResult
      | undefined;

    let independentFromFinalSource =
      false;

    if (
      independentRequired
    ) {
      if (
        !this.executor
      ) {
        addFinding(
          findings,
          {
            code:
              "independent-critic-executor-missing",
            severity:
              "error",
            source:
              "independent-critic",
            message:
              "Independent critic verification is required, but no critic executor is configured.",
          },
        );

        deterministicVerdict =
          "blocked";
      } else if (
        !input.criticCandidate
      ) {
        addFinding(
          findings,
          {
            code:
              "independent-critic-candidate-missing",
            severity:
              "error",
            source:
              "independent-critic",
            message:
              "Independent critic verification is required, but no critic model candidate was supplied.",
          },
        );

        deterministicVerdict =
          "blocked";
      } else {
        const criticCandidate =
          input.criticCandidate;

        independentFromFinalSource =
          !sourceCandidateId ||
          criticCandidate.id !==
            sourceCandidateId;

        if (
          !independentFromFinalSource
        ) {
          addFinding(
            findings,
            {
              code:
                "critic-not-independent",
              severity:
                "error",
              source:
                "independent-critic",
              message:
                "The critic candidate is the same model candidate that produced the final source output.",
            },
          );

          deterministicVerdict =
            "blocked";
        } else if (
          !criticCandidate.enabled ||
          criticCandidate
            .availability !==
            "available"
        ) {
          addFinding(
            findings,
            {
              code:
                "critic-unavailable",
              severity:
                "error",
              source:
                "independent-critic",
              message:
                "The supplied critic candidate is disabled or unavailable.",
            },
          );

          deterministicVerdict =
            "blocked";
        } else if (
          input
            .reasoningContract
            .taskProfile
            .privacySensitivity ===
            "highly-sensitive" &&
          (
            !criticCandidate.local ||
            criticCandidate
              .privacy
              .promptLeavesDevice ===
              true
          )
        ) {
          addFinding(
            findings,
            {
              code:
                "critic-privacy-ineligible",
              severity:
                "error",
              source:
                "independent-critic",
              message:
                "Highly-sensitive verification cannot be sent to the supplied non-local critic candidate.",
            },
          );

          deterministicVerdict =
            "blocked";
        } else {
          independentAttempted =
            true;

          const execution =
            await this.executor({
              candidate:
                criticCandidate,
              pass:
                "critic",
              purpose:
                "Independently verify the OH-4S final candidate.",
              prompt:
                criticPrompt({
                  orchestration:
                    input.orchestration,
                  contract:
                    input
                      .reasoningContract,
                  evidence,
                }),
              timeoutMs:
                input.timeoutMs,
            });

          if (
            !execution.ok ||
            !execution.text
              ?.trim()
          ) {
            addFinding(
              findings,
              {
                code:
                  "independent-critic-failed",
                severity:
                  "error",
                source:
                  "independent-critic",
                message:
                  `Independent critic execution failed${execution.error ? `: ${execution.error}` : "."}`,
              },
            );

            deterministicVerdict =
              "blocked";
          } else {
            try {
              independentResult =
                parseIndependentCritic(
                  execution.text,
                );

              independentParsed =
                true;

              for (
                const finding
                of independentResult
                  .findings
              ) {
                addFinding(
                  findings,
                  {
                    code:
                      `critic:${finding.code}`,
                    severity:
                      finding.severity,
                    source:
                      "independent-critic",
                    message:
                      finding.message,
                  },
                );
              }
            } catch (
              error
            ) {
              addFinding(
                findings,
                {
                  code:
                    "independent-critic-unparseable",
                  severity:
                    "error",
                  source:
                    "independent-critic",
                  message:
                    error instanceof Error
                      ? error.message
                      : String(
                          error,
                        ),
                },
              );

              deterministicVerdict =
                "blocked";
            }
          }
        }
      }
    }

    let verdict =
      deterministicVerdict;

    if (
      independentResult
    ) {
      verdict =
        mergeVerdict(
          deterministicVerdict,
          independentResult
            .verdict,
        );
    }

    if (
      verdict ===
        "pass" &&
      findings.some(
        (finding) =>
          finding.severity ===
          "error"
      )
    ) {
      verdict =
        "reject";
    }

    if (
      independentRequired &&
      !independentParsed &&
      verdict !==
        "blocked"
    ) {
      verdict =
        "blocked";
    }

    if (
      input.orchestration
        .warnings.length >
      0
    ) {
      warnings.push(
        ...input.orchestration
          .warnings,
      );
    }

    if (
      verdict !==
      "pass"
    ) {
      warnings.push(
        "Verification did not produce a trusted conclusion. Downstream authority/action layers must not treat the candidate as accepted.",
      );
    }

    const deterministicTests =
      evidence
        .deterministicTests ??
      [];

    return {
      version:
        CRITIC_VERIFICATION_LAYER_VERSION,
      startedAt,
      completedAt:
        new Date()
          .toISOString(),
      verdict,
      trustedConclusion:
        verdict ===
        "pass",
      orchestrationStatus:
        input.orchestration
          .status,
      finalSourceRunId:
        input.orchestration
          .finalSourceRunId,
      findings:
        structuredClone(
          findings,
        ),
      deterministic: {
        checksRun:
          deterministicTests
            .length,
        checksPassed:
          deterministicTests
            .filter(
              (check) =>
                check.passed,
            )
            .length,
        checksFailed:
          deterministicTests
            .filter(
              (check) =>
                !check.passed,
            )
            .length,
        constraintChecksRun:
          (
            evidence
              .constraintChecks ??
            []
          ).length,
        factualChecksRun:
          (
            evidence
              .factualChecks ??
            []
          ).length,
        evidenceReferenceCount:
          (
            evidence
              .evidenceReferences ??
            []
          ).length,
      },
      independentCritic: {
        required:
          independentRequired,
        attempted:
          independentAttempted,
        candidateId:
          input.criticCandidate
            ?.id,
        independentFromFinalSource,
        parsed:
          independentParsed,
        verdict:
          independentResult
            ?.verdict,
        summary:
          independentResult
            ?.summary,
      },
      provenance: {
        reasoningContractVersion:
          input
            .reasoningContract
            .version,
        orchestratorVersion:
          input
            .orchestration
            .version,
        criticLayerVersion:
          CRITIC_VERIFICATION_LAYER_VERSION,
      },
      invariants: {
        toolsExecuted:
          false,
        actionsExecuted:
          false,
        authorityBypassed:
          false,
        resultRewritten:
          false,
        hiddenScratchReasoningRequested:
          false,
        hiddenScratchReasoningPersisted:
          false,
      },
      warnings:
        [
          ...new Set(
            warnings,
          ),
        ],
    };
  }
}