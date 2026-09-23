import {
  createHash,
} from "node:crypto";
import type {
  NotificationActionAssessment,
  NotificationActionKind,
  NotificationClass,
  NotificationClassification,
  NotificationContentAvailability,
  NotificationCorrespondenceAssessment,
  NotificationImportance,
  NotificationImportanceAssessment,
  NotificationIntelligenceObservation,
  NotificationIntelligenceResult,
  NotificationResponsibilityRecommendation,
} from "./types";

const COMMUNICATION_PACKAGES =
  [
    "whatsapp",
    "signal",
    "telegram",
    "messenger",
    "messages",
    "discord",
    "slack",
    "teams",
    "viber",
  ];

const EMAIL_PACKAGES =
  [
    "gmail",
    "outlook",
    "mail",
    "protonmail",
  ];

const FINANCE_PACKAGES =
  [
    "revolut",
    "paypal",
    "bank",
    "banking",
    "aib",
    "boi",
    "stripe",
  ];

const DELIVERY_PACKAGES =
  [
    "amazon",
    "dpd",
    "anpost",
    "an post",
    "ups",
    "fedex",
    "deliveroo",
    "justeat",
    "just eat",
  ];

const WORK_PACKAGES =
  [
    "workday",
    "deputy",
    "rotacloud",
    "teams",
    "slack",
  ];

const SECURITY_PACKAGES =
  [
    "authenticator",
    "security",
    "okta",
    "duo",
  ];

const REQUEST_PATTERNS:
  ReadonlyArray<{
    pattern: RegExp;
    kind: NotificationActionKind;
    suggestedAction: string;
  }> = [
    {
      pattern:
        /\b(?:can|could|would|will)\s+you\b/iu,
      kind:
        "reply",
      suggestedAction:
        "Review the request and respond.",
    },
    {
      pattern:
        /\b(?:please\s+)?(?:reply|respond|get back to me)\b/iu,
      kind:
        "reply",
      suggestedAction:
        "Reply to the sender.",
    },
    {
      pattern:
        /\b(?:confirm|confirmation|let me know)\b/iu,
      kind:
        "confirm",
      suggestedAction:
        "Confirm or decline as appropriate.",
    },
    {
      pattern:
        /\b(?:send|forward|share|email)\b/iu,
      kind:
        "send",
      suggestedAction:
        "Send or share the requested item.",
    },
    {
      pattern:
        /\b(?:call|ring|phone)\s+(?:me|us|them|back)\b/iu,
      kind:
        "call",
      suggestedAction:
        "Make the requested call.",
    },
    {
      pattern:
        /\b(?:pay|payment\s+due|invoice\s+due|amount\s+due)\b/iu,
      kind:
        "pay",
      suggestedAction:
        "Review the payment request.",
    },
    {
      pattern:
        /\b(?:meeting|appointment|interview|shift)\b/iu,
      kind:
        "attend",
      suggestedAction:
        "Review the scheduled commitment.",
    },
    {
      pattern:
        /\b(?:complete|finish|submit|fill\s+in|fill\s+out)\b/iu,
      kind:
        "complete",
      suggestedAction:
        "Complete the requested task.",
    },
    {
      pattern:
        /\b(?:review|check|look over|approve)\b/iu,
      kind:
        "review",
      suggestedAction:
        "Review the requested item.",
    },
    {
      pattern:
        /\b(?:schedule|reschedule|book|choose a time)\b/iu,
      kind:
        "schedule",
      suggestedAction:
        "Arrange the requested time.",
    },
    {
      pattern:
        /\b(?:need you to|need an answer|action required|to do|todo)\b/iu,
      kind:
        "generic-action",
      suggestedAction:
        "Review and complete the requested action.",
    },
  ];

const CRITICAL_PATTERNS =
  [
    /\bemergency\b/iu,
    /\baccount\s+(?:compromised|locked)\b/iu,
    /\bsuspicious\s+(?:login|activity|transaction)\b/iu,
    /\bfraud\b/iu,
    /\bimmediate\s+action\s+required\b/iu,
  ];

const IMPORTANT_PATTERNS =
  [
    /\burgent\b/iu,
    /\basap\b/iu,
    /\btoday\b/iu,
    /\btonight\b/iu,
    /\bdeadline\b/iu,
    /\bdue\b/iu,
    /\bneed an answer\b/iu,
    /\baction required\b/iu,
  ];

function clamp(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      1,
      Number(
        value.toFixed(2),
      ),
    ),
  );
}

function text(
  observation:
    NotificationIntelligenceObservation,
): {
  content: string;
  title?: string;
  body?: string;
  availability: NotificationContentAvailability;
} {
  const redactedTitle =
    observation.redactedTitle
      ?.trim();

  const redactedBody =
    observation.redactedBody
      ?.trim();

  if (
    redactedTitle ||
    redactedBody
  ) {
    const values =
      [
        redactedTitle,
        redactedBody,
      ].filter(
        Boolean,
      ) as string[];

    return {
      content:
        values.join(
          "\n",
        ),
      title:
        redactedTitle,
      body:
        redactedBody,
      availability:
        "redacted-content",
    };
  }

  const rawTitle =
    observation.title
      ?.trim();

  const rawBody =
    observation.body
      ?.trim();

  if (
    rawTitle ||
    rawBody
  ) {
    const values =
      [
        rawTitle,
        rawBody,
      ].filter(
        Boolean,
      ) as string[];

    return {
      content:
        values.join(
          "\n",
        ),
      title:
        rawTitle,
      body:
        rawBody,
      availability:
        "full-content",
    };
  }

  return {
    content:
      "",
    availability:
      "metadata-only",
  };
}

function haystack(
  observation:
    NotificationIntelligenceObservation,
): string {
  return [
    observation.appPackage,
    observation.appLabel,
    observation.category,
    observation.channelId,
  ]
    .filter(Boolean)
    .join(
      " ",
    )
    .toLocaleLowerCase();
}

function containsAny(
  value: string,
  tokens: readonly string[],
): boolean {
  return tokens.some(
    (token) =>
      value.includes(
        token,
      ),
  );
}

function classify(
  observation:
    NotificationIntelligenceObservation,
): NotificationClassification {
  const metadata =
    haystack(
      observation,
    );

  const category =
    observation.category
      ?.toLocaleLowerCase()
      .trim();

  const reasons:
    string[] =
    [];

  let kind:
    NotificationClass =
    "other";

  let confidence =
    0.45;

  if (
    category === "msg" ||
    category === "message" ||
    containsAny(
      metadata,
      COMMUNICATION_PACKAGES,
    )
  ) {
    kind =
      "communication";
    confidence =
      category === "msg"
        ? 0.96
        : 0.88;
    reasons.push(
      "Messaging category or known communication application.",
    );
  } else if (
    category === "email" ||
    containsAny(
      metadata,
      EMAIL_PACKAGES,
    )
  ) {
    kind =
      "email";
    confidence =
      0.9;
    reasons.push(
      "Email category or known mail application.",
    );
  } else if (
    category === "event" ||
    metadata.includes(
      "calendar",
    )
  ) {
    kind =
      "calendar";
    confidence =
      0.9;
    reasons.push(
      "Calendar/event metadata.",
    );
  } else if (
    category === "reminder" ||
    category === "alarm"
  ) {
    kind =
      "reminder";
    confidence =
      0.94;
    reasons.push(
      "Android reminder/alarm category.",
    );
  } else if (
    containsAny(
      metadata,
      WORK_PACKAGES,
    )
  ) {
    kind =
      "work";
    confidence =
      0.78;
    reasons.push(
      "Known work application.",
    );
  } else if (
    containsAny(
      metadata,
      FINANCE_PACKAGES,
    )
  ) {
    kind =
      "finance";
    confidence =
      0.84;
    reasons.push(
      "Known finance application.",
    );
  } else if (
    containsAny(
      metadata,
      DELIVERY_PACKAGES,
    )
  ) {
    kind =
      "delivery";
    confidence =
      0.82;
    reasons.push(
      "Known delivery/commerce application.",
    );
  } else if (
    containsAny(
      metadata,
      SECURITY_PACKAGES,
    )
  ) {
    kind =
      "security";
    confidence =
      0.8;
    reasons.push(
      "Known authentication/security application.",
    );
  } else if (
    metadata.includes(
      "android",
    ) ||
    metadata.includes(
      "systemui",
    ) ||
    metadata.includes(
      "chernobog",
    ) ||
    category === "system"
  ) {
    kind =
      "system";
    confidence =
      0.88;
    reasons.push(
      "System/application service metadata.",
    );
  } else {
    reasons.push(
      "No stronger deterministic category signal.",
    );
  }

  return {
    kind,
    confidence:
      clamp(
        confidence,
      ),
    reasons,
  };
}

function correspondence(
  observation:
    NotificationIntelligenceObservation,
  classification:
    NotificationClassification,
  availability:
    NotificationContentAvailability,
): NotificationCorrespondenceAssessment {
  const reasons:
    string[] =
    [];

  let confidence =
    0.15;

  if (
    classification.kind ===
      "communication" ||
    classification.kind ===
      "email"
  ) {
    confidence +=
      0.5;

    reasons.push(
      "Notification originates from a correspondence-oriented channel.",
    );
  }

  if (
    observation.sender
      ?.trim()
  ) {
    confidence +=
      0.28;

    reasons.push(
      "Sender identity is present in the sanitized observation.",
    );
  }

  if (
    availability !==
      "metadata-only"
  ) {
    confidence +=
      0.08;
  }

  confidence =
    clamp(
      confidence,
    );

  return {
    likelyCorrespondence:
      confidence >=
      0.65,
    confidence,
    reasons:
      reasons.length > 0
        ? reasons
        : [
            "No direct correspondence evidence.",
          ],
  };
}

function action(
  content: string,
  classification:
    NotificationClassification,
): NotificationActionAssessment {
  if (
    !content
  ) {
    return {
      actionRequired:
        false,
      kind:
        "none",
      confidence:
        0.15,
      reasons: [
        "No sanitized notification content is available for semantic action detection.",
      ],
    };
  }

  for (
    const rule of
    REQUEST_PATTERNS
  ) {
    if (
      rule.pattern.test(
        content,
      )
    ) {
      return {
        actionRequired:
          true,
        kind:
          rule.kind,
        confidence:
          clamp(
            (
              classification.kind ===
                "communication" ||
              classification.kind ===
                "email"
            )
              ? 0.91
              : 0.82,
          ),
        suggestedAction:
          rule.suggestedAction,
        reasons: [
          `Matched deterministic ${rule.kind} request language.`,
        ],
      };
    }
  }

  if (
    classification.kind ===
      "reminder" ||
    classification.kind ===
      "calendar"
  ) {
    return {
      actionRequired:
        true,
      kind:
        classification.kind ===
          "calendar"
          ? "attend"
          : "generic-action",
      confidence:
        0.72,
      suggestedAction:
        classification.kind ===
          "calendar"
          ? "Review the scheduled commitment."
          : "Review the reminder.",
      reasons: [
        "Calendar/reminder content implies a user commitment.",
      ],
    };
  }

  return {
    actionRequired:
      false,
    kind:
      "none",
    confidence:
      0.55,
    reasons: [
      "No deterministic action language matched.",
    ],
  };
}

function importance(
  content: string,
  classification:
    NotificationClassification,
  actionAssessment:
    NotificationActionAssessment,
): NotificationImportanceAssessment {
  const reasons:
    string[] =
    [];

  let level:
    NotificationImportance =
    "normal";

  let confidence =
    0.65;

  if (
    CRITICAL_PATTERNS.some(
      (pattern) =>
        pattern.test(
          content,
        ),
    )
  ) {
    level =
      "critical";
    confidence =
      0.93;
    reasons.push(
      "Critical security/emergency language matched.",
    );
  } else if (
    IMPORTANT_PATTERNS.some(
      (pattern) =>
        pattern.test(
          content,
        ),
    )
  ) {
    level =
      "important";
    confidence =
      0.88;
    reasons.push(
      "Urgency/deadline language matched.",
    );
  } else if (
    actionAssessment.actionRequired &&
    actionAssessment.confidence >=
      0.8
  ) {
    level =
      "important";
    confidence =
      0.78;
    reasons.push(
      "High-confidence user action is required.",
    );
  } else if (
    classification.kind ===
      "system"
  ) {
    level =
      "low";
    confidence =
      0.76;
    reasons.push(
      "Routine system notification.",
    );
  } else {
    reasons.push(
      "No urgency or criticality signal detected.",
    );
  }

  return {
    level,
    confidence:
      clamp(
        confidence,
      ),
    reasons,
  };
}

function priorityFromImportance(
  level:
    NotificationImportance,
): "low" | "normal" | "important" | "critical" {
  return level;
}

function compactSummary(
  observation:
    NotificationIntelligenceObservation,
  content: ReturnType<
    typeof text
  >,
  classification:
    NotificationClassification,
): string {
  const source =
    observation.sender
      ?.trim() ||
    observation.appLabel
      ?.trim() ||
    observation.appPackage
      ?.trim() ||
    "Notification";

  const body =
    content.body ??
    content.title;

  if (
    body
  ) {
    return `${source}: ${body}`.slice(
      0,
      1000,
    );
  }

  return `${source} produced a ${classification.kind} notification requiring review.`;
}

function responsibilityTitle(
  observation:
    NotificationIntelligenceObservation,
  actionAssessment:
    NotificationActionAssessment,
  classification:
    NotificationClassification,
): string {
  const sender =
    observation.sender
      ?.trim();

  if (
    sender &&
    actionAssessment.kind ===
      "reply"
  ) {
    return `Reply to ${sender}`.slice(
      0,
      240,
    );
  }

  if (
    sender &&
    actionAssessment.kind ===
      "confirm"
  ) {
    return `Confirm with ${sender}`.slice(
      0,
      240,
    );
  }

  const source =
    sender ||
    observation.appLabel
      ?.trim() ||
    observation.appPackage
      ?.trim();

  const verb =
    {
      reply:
        "Reply",
      confirm:
        "Confirm",
      send:
        "Send requested item",
      call:
        "Make requested call",
      pay:
        "Review payment",
      attend:
        "Review scheduled commitment",
      complete:
        "Complete requested task",
      review:
        "Review requested item",
      schedule:
        "Arrange requested time",
      "generic-action":
        "Handle requested action",
      none:
        "Review notification",
    }[
      actionAssessment.kind
    ];

  if (
    source
  ) {
    return `${verb} — ${source}`.slice(
      0,
      240,
    );
  }

  return (
    classification.kind ===
      "reminder"
      ? "Review reminder"
      : verb
  ).slice(
    0,
    240,
  );
}

function mergeKey(
  observation:
    NotificationIntelligenceObservation,
  classification:
    NotificationClassification,
): string | undefined {
  const sender =
    observation.sender
      ?.trim()
      .toLocaleLowerCase();

  if (
    !sender
  ) {
    return undefined;
  }

  if (
    classification.kind !==
      "communication" &&
    classification.kind !==
      "email"
  ) {
    return undefined;
  }

  const application =
    (
      observation.appPackage ??
      observation.appLabel ??
      classification.kind
    )
      .trim()
      .toLocaleLowerCase();

  const digest =
    createHash(
      "sha256",
    )
      .update(
        [
          application,
          sender,
        ].join(
          "\u0000",
        ),
      )
      .digest(
        "hex",
      )
      .slice(
        0,
        32,
      );

  return `notification-thread:${digest}`;
}

function recommendResponsibility(
  observation:
    NotificationIntelligenceObservation,
  content:
    ReturnType<
      typeof text
    >,
  classification:
    NotificationClassification,
  correspondenceAssessment:
    NotificationCorrespondenceAssessment,
  actionAssessment:
    NotificationActionAssessment,
  importanceAssessment:
    NotificationImportanceAssessment,
): NotificationResponsibilityRecommendation {
  const reasons:
    string[] =
    [];

  if (
    content.availability ===
      "metadata-only"
  ) {
    reasons.push(
      "Metadata-only evidence is insufficient to infer a personal responsibility safely.",
    );

    return {
      shouldCreate:
        false,
      state:
        "detected",
      priority:
        priorityFromImportance(
          importanceAssessment.level,
        ),
      requiresHuman:
        false,
      confidence:
        0.2,
      reasons,
    };
  }

  const semanticConfidence =
    Math.max(
      actionAssessment.confidence,
      correspondenceAssessment.confidence,
    );

  const shouldCreate =
    actionAssessment.actionRequired &&
    actionAssessment.confidence >=
      0.72;

  if (
    !shouldCreate
  ) {
    reasons.push(
      "No sufficiently strong action signal was detected.",
    );

    return {
      shouldCreate:
        false,
      state:
        "detected",
      priority:
        priorityFromImportance(
          importanceAssessment.level,
        ),
      requiresHuman:
        false,
      confidence:
        clamp(
          semanticConfidence,
        ),
      reasons,
    };
  }

  reasons.push(
    "Sanitized content contains a sufficiently strong user-action signal.",
  );

  if (
    correspondenceAssessment.likelyCorrespondence
  ) {
    reasons.push(
      "The notification is also likely direct correspondence.",
    );
  }

  return {
    shouldCreate:
      true,
    state:
      "waiting-user",
    priority:
      priorityFromImportance(
        importanceAssessment.level,
      ),
    requiresHuman:
      true,
    title:
      responsibilityTitle(
        observation,
        actionAssessment,
        classification,
      ),
    summary:
      compactSummary(
        observation,
        content,
        classification,
      ),
    suggestedAction:
      actionAssessment.suggestedAction,
    mergeKey:
      mergeKey(
        observation,
        classification,
      ),
    confidence:
      clamp(
        semanticConfidence,
      ),
    reasons,
  };
}

export function analyzeNotification(
  observation:
    NotificationIntelligenceObservation,
): NotificationIntelligenceResult {
  if (
    !observation.eventId
      ?.trim()
  ) {
    throw new Error(
      "eventId is required.",
    );
  }

  const content =
    text(
      observation,
    );

  const classification =
    classify(
      observation,
    );

  const correspondenceAssessment =
    correspondence(
      observation,
      classification,
      content.availability,
    );

  const actionAssessment =
    action(
      content.content,
      classification,
    );

  const importanceAssessment =
    importance(
      content.content,
      classification,
      actionAssessment,
    );

  const responsibility =
    recommendResponsibility(
      observation,
      content,
      classification,
      correspondenceAssessment,
      actionAssessment,
      importanceAssessment,
    );

  return {
    eventId:
      observation.eventId.trim(),
    analyzedAt:
      new Date().toISOString(),
    contentAvailability:
      content.availability,
    classification,
    correspondence:
      correspondenceAssessment,
    action:
      actionAssessment,
    importance:
      importanceAssessment,
    responsibility,
  };
}
