# Chernobog Phase 11 - Live World State Feed Preflight

Generated: 2026-08-31T02:14:46.4414776+01:00

Purpose: determine why conversational 11G now exposes only stale acceptance/execution evidence instead of fresh runtime observations.

## Event Spine recent-event summary

- bytes: 105134
- modified: 2026-08-31T02:12:42.3205417+01:00

- parsed recent events: 120

### Latest 20 parsed events

```text
2026-08-31T01:12:42.318Z | model.completed | gemma3:latest | llm
2026-08-31T01:12:32.425Z | model.requested | gemma3:latest | llm
2026-08-31T01:12:32.403Z | model.route.selected | gemma3:latest | llm
2026-08-31T01:12:32.353Z | model.completed | gemma3:latest | llm
2026-08-31T01:12:32.197Z | model.requested | gemma3:latest | llm
2026-08-31T01:12:32.195Z | model.route.selected | gemma3:latest | llm
2026-08-31T01:12:32.189Z | model.completed | gemma3:latest | llm
2026-08-31T01:12:31.522Z | model.requested | gemma3:latest | llm
2026-08-31T01:12:31.517Z | model.route.selected | gemma3:latest | llm
2026-08-31T01:03:43.727Z | model.completed | gemma3:latest | llm
2026-08-31T01:03:43.089Z | model.requested | gemma3:latest | llm
2026-08-31T01:03:43.087Z | model.route.selected | gemma3:latest | llm
2026-08-31T01:03:43.079Z | model.completed | gemma3:latest | llm
2026-08-31T01:03:41.445Z | model.requested | gemma3:latest | llm
2026-08-31T01:03:41.443Z | model.route.selected | gemma3:latest | llm
2026-08-31T01:03:41.440Z | model.completed | gemma3:latest | llm
2026-08-31T01:03:40.783Z | model.requested | gemma3:latest | llm
2026-08-31T01:03:40.779Z | model.route.selected | gemma3:latest | llm
2026-08-31T01:01:25.948Z | model.completed | gemma3:latest | llm
2026-08-31T01:01:20.866Z | model.requested | gemma3:latest | llm
```

### Recent event types

- model.completed: 40
- model.requested: 40
- model.route.selected: 40

## Current persisted World State snapshot

- path: `data\chernobog\world-state\current.json`
- bytes: 27865
- modified: 2026-08-31T02:12:42.3272901+01:00

```text
{
  "schemaVersion": 1,
  "createdAt": "2026-08-31T01:12:42.321Z",
  "recordCount": 20,
  "recordsSha256": "fb1c450945cb878fb8f73f66c6527d66bce834dac1dec353d6a6f05ca4d0e19b",
  "records": [
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-1.completed",
      "namespace": "execution",
      "value": {
        "eventType": "execution.completed",
        "severity": "info",
        "subject": "11d-b-1",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-1",
          "category": "system_operation",
          "risk": "safe",
          "status": "completed",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
      "observedAt": "2026-08-28T13:06:53.149Z",
      "updatedAt": "2026-08-31T01:12:32.372Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.149Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "7ef41c3e-69ab-445c-baeb-9922b0af058b",
        "eventType": "execution.completed",
        "eventOccurredAt": "2026-08-28T13:06:53.149Z",
        "eventReceivedAt": "2026-08-28T13:06:53.149Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-1",
        "subject": "11d-b-1",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-1.started",
      "namespace": "execution",
      "value": {
        "eventType": "execution.started",
        "severity": "info",
        "subject": "11d-b-1",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-1",
          "category": "system_operation",
          "risk": "safe",
          "status": "pending",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
      "observedAt": "2026-08-28T13:06:53.144Z",
      "updatedAt": "2026-08-31T01:12:32.372Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.144Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "ebf34300-8a66-43ae-bffc-4c12186ad14f",
        "eventType": "execution.started",
        "eventOccurredAt": "2026-08-28T13:06:53.144Z",
        "eventReceivedAt": "2026-08-28T13:06:53.144Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-1",
        "subject": "11d-b-1",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-2.failed",
      "namespace": "execution",
      "value": {
        "eventType": "execution.failed",
        "severity": "warning",
        "subject": "11d-b-2",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-2",
          "category": "system_operation",
          "risk": "safe",
          "status": "failed",
          "stepCount": 1,
          "currentStepId": "step-1",
          "error": "Cognitive governance denies this action capability."
        }
      },
      "observedAt": "2026-08-28T13:06:53.153Z",
      "updatedAt": "2026-08-31T01:12:32.373Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.153Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "f1989947-6498-4980-9073-12a5b5612e2e",
        "eventType": "execution.failed",
        "eventOccurredAt": "2026-08-28T13:06:53.153Z",
        "eventReceivedAt": "2026-08-28T13:06:53.153Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-2",
        "subject": "11d-b-2",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-2.started",
      "namespace": "execution",
      "value": {
        "eventType": "execution.started",
        "severity": "info",
        "subject": "11d-b-2",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-2",
          "category": "system_operation",
          "risk": "safe",
          "status": "pending",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
      "observedAt": "2026-08-28T13:06:53.151Z",
      "updatedAt": "2026-08-31T01:12:32.372Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.151Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "804713db-6dca-480f-8f94-5233bd075bb8",
        "eventType": "execution.started",
        "eventOccurredAt": "2026-08-28T13:06:53.151Z",
        "eventReceivedAt": "2026-08-28T13:06:53.151Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-2",
        "subject": "11d-b-2",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-3.started",
      "namespace": "execution",
      "value": {
        "eventType": "execution.started",
        "severity": "info",
        "subject": "11d-b-3",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-3",
          "category": "system_operation",
          "risk": "safe",
          "status": "pending",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
      "observedAt": "2026-08-28T13:06:53.154Z",
      "updatedAt": "2026-08-31T01:12:32.373Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.154Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "d3bf9ed0-049b-4673-b040-5fb4cb2c671d",
        "eventType": "execution.started",
        "eventOccurredAt": "2026-08-28T13:06:53.154Z",
        "eventReceivedAt": "2026-08-28T13:06:53.154Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-3",
        "subject": "11d-b-3",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-3.waiting-for-approval",
      "namespace": "execution",
      "value": {
        "eventType": "execution.waiting_for_approval",
        "severity": "notice",
        "subject": "11d-b-3",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-3",
          "category": "system_operation",
          "risk": "safe",
          "status": "waiting_for_approval",
          "stepCount": 1,
          "currentStepId": "step-1",
          "error": "Cognitive governance requires confirmation before execution."
        }
      },
      "observedAt": "2026-08-28T13:06:53.155Z",
      "updatedAt": "2026-08-31T01:12:32.373Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.155Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "794f75f8-6836-4c71-835d-8e1ba52b72c0",
        "eventType": "execution.waiting_for_approval",
        "eventOccurredAt": "2026-08-28T13:06:53.155Z",
        "eventReceivedAt": "2026-08-28T13:06:53.155Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-3",
        "subject": "11d-b-3",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-4.completed",
      "namespace": "execution",
      "value": {
        "eventType": "execution.completed",
        "severity": "info",
        "subject": "11d-b-4",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-4",
          "category": "system_operation",
          "risk": "safe",
          "status": "completed",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
      "observedAt": "2026-08-28T13:06:53.158Z",
      "updatedAt": "2026-08-31T01:12:32.373Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.158Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "2d8b8599-dd75-4f59-879f-c02cd4528812",
        "eventType": "execution.completed",
        "eventOccurredAt": "2026-08-28T13:06:53.158Z",
        "eventReceivedAt": "2026-08-28T13:06:53.158Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-4",
        "subject": "11d-b-4",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-4.started",
      "namespace": "execution",
      "value": {
        "eventType": "execution.started",
        "severity": "info",
        "subject": "11d-b-4",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-4",
          "category": "system_operation",
          "risk": "safe",
          "status": "pending",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
      "observedAt": "2026-08-28T13:06:53.156Z",
      "updatedAt": "2026-08-31T01:12:32.373Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.156Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "26c48cb0-51b7-4cbc-9ec6-a6f88ef46428",
        "eventType": "execution.started",
        "eventOccurredAt": "2026-08-28T13:06:53.156Z",
        "eventReceivedAt": "2026-08-28T13:06:53.156Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-4",
        "subject": "11d-b-4",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-5.failed",
      "namespace": "execution",
      "value": {
        "eventType": "execution.failed",
        "severity": "warning",
        "subject": "11d-b-5",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-5",
          "category": "system_operation",
          "risk": "blocked",
          "status": "failed",
          "stepCount": 1,
          "currentStepId": "step-1",
          "error": "This action is blocked by the execution risk policy."
        }
      },
      "observedAt": "2026-08-28T13:06:53.160Z",
      "updatedAt": "2026-08-31T01:12:32.373Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.160Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "d016dcb7-b841-4d35-b315-04aba9475f89",
        "eventType": "execution.failed",
        "eventOccurredAt": "2026-08-28T13:06:53.160Z",
        "eventReceivedAt": "2026-08-28T13:06:53.160Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-5",
        "subject": "11d-b-5",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-5.started",
      "namespace": "execution",
      "value": {
        "eventType": "execution.started",
        "severity": "info",
        "subject": "11d-b-5",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-5",
          "category": "system_operation",
          "risk": "blocked",
          "status": "pending",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
      "observedAt": "2026-08-28T13:06:53.159Z",
      "updatedAt": "2026-08-31T01:12:32.373Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.159Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "9c36a83b-f932-4ad7-a050-f5636ebe792a",
        "eventType": "execution.started",
        "eventOccurredAt": "2026-08-28T13:06:53.159Z",
        "eventReceivedAt": "2026-08-28T13:06:53.159Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-5",
        "subject": "11d-b-5",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-6.failed",
      "namespace": "execution",
      "value": {
        "eventType": "execution.failed",
        "severity": "warning",
        "subject": "11d-b-6",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-6",
          "category": "system_operation",
          "risk": "safe",
          "status": "failed",
          "stepCount": 1,
          "currentStepId": "step-1",
          "error": "Cognitive governance denies this action capability."
        }
      },
      "observedAt": "2026-08-28T13:06:53.163Z",
      "updatedAt": "2026-08-31T01:12:32.374Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.163Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "c0f3939d-9e57-4892-8d55-94be908ade2f",
        "eventType": "execution.failed",
        "eventOccurredAt": "2026-08-28T13:06:53.163Z",
        "eventReceivedAt": "2026-08-28T13:06:53.163Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-6",
        "subject": "11d-b-6",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-6.started",
      "namespace": "execution",
      "value": {
        "eventType": "execution.started",
        "severity": "info",
        "subject": "11d-b-6",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-6",
          "category": "system_operation",
          "risk": "safe",
          "status": "pending",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
      "observedAt": "2026-08-28T13:06:53.162Z",
      "updatedAt": "2026-08-31T01:12:32.373Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.162Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "4ba9fef3-662b-46ac-856e-31f7a075792e",
        "eventType": "execution.started",
        "eventOccurredAt": "2026-08-28T13:06:53.162Z",
        "eventReceivedAt": "2026-08-28T13:06:53.162Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-6",
        "subject": "11d-b-6",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-7.started",
      "namespace": "execution",
      "value": {
        "eventType": "execution.started",
        "severity": "info",
        "subject": "11d-b-7",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-7",
          "category": "system_operation",
          "risk": "safe",
          "status": "pending",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
      "observedAt": "2026-08-28T13:06:53.164Z",
      "updatedAt": "2026-08-31T01:12:32.374Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.164Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "7d794782-07eb-4776-aab1-d21b01342bd0",
        "eventType": "execution.started",
        "eventOccurredAt": "2026-08-28T13:06:53.164Z",
        "eventReceivedAt": "2026-08-28T13:06:53.164Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-7",
        "subject": "11d-b-7",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-7.waiting-for-approval",
      "namespace": "execution",
      "value": {
        "eventType": "execution.waiting_for_approval",
        "severity": "notice",
        "subject": "11d-b-7",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-7",
          "category": "system_operation",
          "risk": "safe",
          "status": "waiting_for_approval",
          "stepCount": 1,
          "currentStepId": "step-1",
          "error": "High cognitive action risk requires confirmation."
        }
      },
      "observedAt": "2026-08-28T13:06:53.166Z",
      "updatedAt": "2026-08-31T01:12:32.374Z",
      "confidence": 1,
      "confidenceBasis": "default",
      "freshness": {
        "status": "stale",
        "basis": "ttl",
        "expiresAt": "2026-08-28T13:11:53.166Z",
        "ttlMs": 300000,
        "evaluatedAt": "2026-08-31T01:12:42.321Z"
      },
      "provenance": {
        "eventId": "171b18d1-f969-4c47-b017-379e8663c5b2",
        "eventType": "execution.waiting_for_approval",
        "eventOccurredAt": "2026-08-28T13:06:53.166Z",
        "eventReceivedAt": "2026-08-28T13:06:53.166Z",
        "projectorId": "domain-generic-factual-mirror",
        "correlationId": "11d-b-7",
        "subject": "11d-b-7",
        "scope": "execution:system_operation",
        "source": {
          "subsystem": "execution"
        }
      }
    },
    {
      "schemaVersion": 1,
      "key": "execution.11d-b-8.started",
      "namespace": "execution",
      "value": {
        "eventType": "execution.started",
        "severity": "info",
        "subject": "11d-b-8",
        "scope": "execution:system_operation",
        "payload": {
          "taskId": "11d-b-8",
          "category": "system_operation",
          "risk": "safe",
          "status": "pending",
          "stepCount": 1,
          "currentStepId": "step-1"
        }
      },
 

[preview truncated by diagnostic]
```

## Runtime publisher start/registration functions

Pattern: `export\s+(async\s+)?function\s+(start|register|publish|report)|setInterval|setTimeout|runtime\.health_observed|service\.healthy|runtime\.node_online|runtime\.model_available|project\.git_observed`

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 81

```text
   76:       ],
   77:     },
   78:   });
   79: }
   80: 
>  81: export async function publishModelAvailabilitySnapshot(
   82:   snapshot: ModelAvailabilitySnapshot,
   83:   options: {
   84:     providerId?: string;
   85:     nodeId?: string;
   86:   } = {}
```

### lib\chernobog\runtime\ollamaHealth.ts line 174

```text
  169:   
  170:     const controller =
  171:       new AbortController();
  172:   
  173:     const timeout =
> 174:       setTimeout(
  175:         () => {
  176:           controller.abort();
  177:         },
  178:         timeoutMs
  179:       );
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 38

```text
   33:     capabilities: observation.capabilities,
   34:     observedAt: observation.observedAt,
   35:   };
   36: }
   37: 
>  38: export async function publishRuntimeHealthObservation(
   39:   observation: ChernobogRuntimeObservation,
   40:   options: PublishRuntimeHealthOptions = {}
   41: ): Promise<void> {
   42:   const payload =
   43:     buildCommonPayload(observation);
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 46

```text
   41: ): Promise<void> {
   42:   const payload =
   43:     buildCommonPayload(observation);
   44: 
   45:   await publishChernobogEventSafely({
>  46:     type: "runtime.health_observed",
   47: 
   48:     source: {
   49:       subsystem: "runtime-health",
   50:       nodeId: observation.nodeId,
   51:     },
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 64

```text
   59:       : "runtime",
   60: 
   61:     payload,
   62: 
   63:     dedupeKey: [
>  64:       "runtime.health_observed",
   65:       observation.kind,
   66:       observation.id,
   67:       observation.status,
   68:       observation.nodeId ?? "local",
   69:     ].join(":"),
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 121

```text
  116:       });
  117:     }
  118: 
  119:     const type =
  120:       observation.status === "healthy"
> 121:         ? "service.healthy"
  122:         : observation.status === "degraded"
  123:           ? "service.degraded"
  124:           : "service.failed";
  125: 
  126:     await publishChernobogEventSafely({
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 169

```text
  164:       observation.status === "healthy" ||
  165:       observation.status === "degraded";
  166: 
  167:     await publishChernobogEventSafely({
  168:       type: online
> 169:         ? "runtime.node_online"
  170:         : "runtime.node_offline",
  171: 
  172:       source: {
  173:         subsystem: "runtime-health",
  174:         nodeId: observation.nodeId,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 187

```text
  182: 
  183:       payload,
  184: 
  185:       dedupeKey: [
  186:         online
> 187:           ? "runtime.node_online"
  188:           : "runtime.node_offline",
  189:         observation.id,
  190:         observation.nodeId ?? "local",
  191:       ].join(":"),
  192: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 211

```text
  206:     observation.status === "healthy" ||
  207:     observation.status === "degraded";
  208: 
  209:   await publishChernobogEventSafely({
  210:     type: available
> 211:       ? "runtime.model_available"
  212:       : "runtime.model_unavailable",
  213: 
  214:     source: {
  215:       subsystem: "runtime-health",
  216:       nodeId: observation.nodeId,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 229

```text
  224: 
  225:     payload,
  226: 
  227:     dedupeKey: [
  228:       available
> 229:         ? "runtime.model_available"
  230:         : "runtime.model_unavailable",
  231:       observation.id,
  232:       observation.nodeId ?? "local",
  233:     ].join(":"),
  234: 
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 104

```text
   99:       observedAt:
  100:         report.observedAt,
  101:     });
  102:   }
  103:   
> 104:   export async function reportServiceHealth(
  105:     report: ServiceHealthReport,
  106:     options:
  107:       RuntimeHealthReportOptions = {}
  108:   ): Promise<ChernobogRuntimeObservation> {
  109:     const observation =
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 126

```text
  121:     );
  122:   
  123:     return observation;
  124:   }
  125:   
> 126:   export async function reportRuntimeNodeHealth(
  127:     report: RuntimeNodeHealthReport,
  128:     options:
  129:       RuntimeHealthReportOptions = {}
  130:   ): Promise<ChernobogRuntimeObservation> {
  131:     const observation =
```

### lib\chernobog\operations\backupStorageEvents.ts line 123

```text
  118:     previousStatus !== undefined &&
  119:     previousStatus !== "healthy"
  120:   );
  121: }
  122: 
> 123: export async function publishBackupObservation(
  124:   observation:
  125:     ChernobogBackupObservation,
  126:   options:
  127:     PublishBackupObservationOptions = {}
  128: ): Promise<void> {
```

### lib\chernobog\operations\backupStorageEvents.ts line 280

```text
  275:       ],
  276:     },
  277:   });
  278: }
  279: 
> 280: export async function publishStorageObservation(
  281:   observation:
  282:     ChernobogStorageObservation,
  283:   options:
  284:     PublishStorageObservationOptions = {}
  285: ): Promise<void> {
```

### lib\chernobog\operations\backupStorageReporters.ts line 86

```text
   81:   
   82:   export interface StorageReportOptions {
   83:     previousStatus?: ChernobogStorageStatus;
   84:   }
   85:   
>  86:   export async function reportBackupState(
   87:     report: BackupReport,
   88:     options: BackupReportOptions = {}
   89:   ): Promise<ChernobogBackupObservation> {
   90:     const observation =
   91:       createBackupObservation({
```

### lib\chernobog\operations\backupStorageReporters.ts line 140

```text
  135:     );
  136:   
  137:     return observation;
  138:   }
  139:   
> 140:   export async function reportStorageState(
  141:     report: StorageReport,
  142:     options: StorageReportOptions = {}
  143:   ): Promise<ChernobogStorageObservation> {
  144:     const observation =
  145:       createStorageObservation({
```

### lib\chernobog\desktop\desktopEvents.ts line 79

```text
   74:     workspace.projectId ?? "",
   75:     workspace.kind ?? "",
   76:   ].join(":");
   77: }
   78: 
>  79: export async function publishDesktopObservation(
   80:   observation:
   81:     ChernobogDesktopObservation,
   82:   options:
   83:     PublishDesktopObservationOptions = {}
   84: ): Promise<void> {
```

### lib\chernobog\desktop\desktopReporter.ts line 133

```text
  128:     }
  129:   
  130:     lastObservationByNode.clear();
  131:   }
  132:   
> 133:   export async function reportDesktopState(
  134:     report: DesktopStateReport,
  135:     options:
  136:       ReportDesktopStateOptions = {}
  137:   ): Promise<ChernobogDesktopObservation> {
  138:     const observation =
```

### lib\chernobog\events\publishers.ts line 28

```text
   23:   ];
   24: 
   25:   return tags.length > 0 ? tags : undefined;
   26: }
   27: 
>  28: export async function publishChernobogEventSafely<TPayload>(
   29:   input: ChernobogEventInput<TPayload>,
   30:   publisher?: ChernobogEventPublisher
   31: ): Promise<ChernobogEventPublishResult | null> {
   32:   const context = getChernobogEventContext();
   33: 
```


## Live application startup references to event publishers

Pattern: `start.*Publisher|start.*Reporter|register.*Publisher|publishRuntime|publishService|health.*publish|runtimeHealth|modelAvailability|desktop.*event|backup.*event|getChernobogEventBus|getChernobogWorldStateRuntime`

### app\api\events\route.ts line 4

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import {
>   4:   getChernobogEventBus,
    5:   type ChernobogEventQuery,
    6: } from "@/lib/chernobog/events";
    7: 
    8: export const runtime = "nodejs";
    9: export const dynamic = "force-dynamic";
```

### app\api\events\route.ts line 298

```text
  293:       buildEventQuery(
  294:         request
  295:       );
  296: 
  297:     const events =
> 298:       await getChernobogEventBus()
  299:         .query(
  300:           query
  301:         );
  302: 
  303:     return NextResponse.json(
```

### app\api\events\diagnostics\route.ts line 4

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import {
>   4:   getChernobogEventBus,
    5: } from "@/lib/chernobog/events";
    6: 
    7: export const runtime = "nodejs";
    8: export const dynamic = "force-dynamic";
    9: 
```

### app\api\events\diagnostics\route.ts line 17

```text
   12: };
   13: 
   14: export async function GET() {
   15:   try {
   16:     const diagnostics =
>  17:       await getChernobogEventBus()
   18:         .getDiagnostics();
   19: 
   20:     return NextResponse.json(
   21:       {
   22:         ok: true,
```

### app\api\world-state\route.ts line 8

```text
    3:   NextResponse,
    4: } from "next/server";
    5: 
    6: import {
    7:   WorldStateSnapshotCorruptionError,
>   8:   getChernobogWorldStateRuntime,
    9:   parseWorldStateReadQuery,
   10:   queryPersistedWorldState,
   11: } from "@/lib/chernobog/worldState";
   12: 
   13: export const runtime = "nodejs";
```

### app\api\world-state\route.ts line 24

```text
   19:     const query =
   20:       parseWorldStateReadQuery(
   21:         request.nextUrl.searchParams,
   22:       );
   23: 
>  24:     await getChernobogWorldStateRuntime();
   25: 
   26:     const result =
   27:       await queryPersistedWorldState({
   28:         query,
   29:       });
```

### lib\chernobog\pipeline\worldStateContext.ts line 3

```text
    1: import {
    2:   ChernobogWorldStateQueryService,
>   3:   getChernobogWorldStateRuntime,
    4:   type WorldStateReadItem,
    5: } from "@/lib/chernobog/worldState";
    6: 
    7: const MAX_WORLD_STATE_RECORDS = 18;
    8: const MAX_VALUE_CHARS = 600;
```

### lib\chernobog\pipeline\worldStateContext.ts line 157

```text
  152:     projectId?: string;
  153:   } = {},
  154: ): Promise<ChernobogWorldStateContext> {
  155:   try {
  156:     const runtime =
> 157:       await getChernobogWorldStateRuntime();
  158: 
  159:     const query =
  160:       new ChernobogWorldStateQueryService(
  161:         runtime.engine.worldState,
  162:       );
```

### lib\chernobog\runtime\modelAvailability.ts line 29

```text
   24:   available: boolean;
   25: 
   26:   matchedInstalledModel?: string;
   27: }
   28: 
>  29: export interface ModelAvailabilitySnapshot {
   30:   roles: ModelRoleAvailability[];
   31: 
   32:   availableRoles: ModelRole[];
   33: 
   34:   unavailableRoles: ModelRole[];
```

### lib\chernobog\runtime\modelAvailability.ts line 67

```text
   62: 
   63:     matchedInstalledModel,
   64:   };
   65: }
   66: 
>  67: export function buildModelAvailabilitySnapshot(
   68:   installedModels: string[],
   69: ): ModelAvailabilitySnapshot {
   70:   const roles =
   71:     CHERNOBOG_MODEL_ROLES.map(
   72:       (role) =>
```

### lib\chernobog\runtime\modelAvailability.ts line 69

```text
   64:   };
   65: }
   66: 
   67: export function buildModelAvailabilitySnapshot(
   68:   installedModels: string[],
>  69: ): ModelAvailabilitySnapshot {
   70:   const roles =
   71:     CHERNOBOG_MODEL_ROLES.map(
   72:       (role) =>
   73:         resolveModelRoleAvailability(
   74:           role,
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 4

```text
    1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
>   4:   ModelAvailabilitySnapshot,
    5:   ModelRoleAvailability,
    6: } from "./modelAvailability";
    7: 
    8: async function publishModelRoleAvailability(
    9:   entry: ModelRoleAvailability,
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 6

```text
    1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
    4:   ModelAvailabilitySnapshot,
    5:   ModelRoleAvailability,
>   6: } from "./modelAvailability";
    7: 
    8: async function publishModelRoleAvailability(
    9:   entry: ModelRoleAvailability,
   10:   providerId: string,
   11:   nodeId?: string
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 81

```text
   76:       ],
   77:     },
   78:   });
   79: }
   80: 
>  81: export async function publishModelAvailabilitySnapshot(
   82:   snapshot: ModelAvailabilitySnapshot,
   83:   options: {
   84:     providerId?: string;
   85:     nodeId?: string;
   86:   } = {}
```

### lib\chernobog\runtime\modelAvailabilityEvents.ts line 82

```text
   77:     },
   78:   });
   79: }
   80: 
   81: export async function publishModelAvailabilitySnapshot(
>  82:   snapshot: ModelAvailabilitySnapshot,
   83:   options: {
   84:     providerId?: string;
   85:     nodeId?: string;
   86:   } = {}
   87: ): Promise<void> {
```

### lib\chernobog\runtime\ollamaHealth.ts line 6

```text
    1: import {
    2:     getOllamaTagsUrl,
    3:   } from "../runtimeConfig";
    4:   
    5:   import {
>   6:     buildModelAvailabilitySnapshot,
    7:     type ModelAvailabilitySnapshot,
    8:   } from "./modelAvailability";
    9:   
   10:   import {
   11:     publishModelAvailabilitySnapshot,
```

### lib\chernobog\runtime\ollamaHealth.ts line 7

```text
    2:     getOllamaTagsUrl,
    3:   } from "../runtimeConfig";
    4:   
    5:   import {
    6:     buildModelAvailabilitySnapshot,
>   7:     type ModelAvailabilitySnapshot,
    8:   } from "./modelAvailability";
    9:   
   10:   import {
   11:     publishModelAvailabilitySnapshot,
   12:   } from "./modelAvailabilityEvents";
```

### lib\chernobog\runtime\ollamaHealth.ts line 8

```text
    3:   } from "../runtimeConfig";
    4:   
    5:   import {
    6:     buildModelAvailabilitySnapshot,
    7:     type ModelAvailabilitySnapshot,
>   8:   } from "./modelAvailability";
    9:   
   10:   import {
   11:     publishModelAvailabilitySnapshot,
   12:   } from "./modelAvailabilityEvents";
   13:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 11

```text
    6:     buildModelAvailabilitySnapshot,
    7:     type ModelAvailabilitySnapshot,
    8:   } from "./modelAvailability";
    9:   
   10:   import {
>  11:     publishModelAvailabilitySnapshot,
   12:   } from "./modelAvailabilityEvents";
   13:   
   14:   import type {
   15:     ChernobogHealthStatus,
   16:     ChernobogRuntimeObservation,
```

### lib\chernobog\runtime\ollamaHealth.ts line 12

```text
    7:     type ModelAvailabilitySnapshot,
    8:   } from "./modelAvailability";
    9:   
   10:   import {
   11:     publishModelAvailabilitySnapshot,
>  12:   } from "./modelAvailabilityEvents";
   13:   
   14:   import type {
   15:     ChernobogHealthStatus,
   16:     ChernobogRuntimeObservation,
   17:   } from "./runtimeHealth";
```

### lib\chernobog\runtime\ollamaHealth.ts line 17

```text
   12:   } from "./modelAvailabilityEvents";
   13:   
   14:   import type {
   15:     ChernobogHealthStatus,
   16:     ChernobogRuntimeObservation,
>  17:   } from "./runtimeHealth";
   18:   
   19:   import {
   20:     createRuntimeObservation,
   21:   } from "./runtimeHealth";
   22:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 21

```text
   16:     ChernobogRuntimeObservation,
   17:   } from "./runtimeHealth";
   18:   
   19:   import {
   20:     createRuntimeObservation,
>  21:   } from "./runtimeHealth";
   22:   
   23:   import {
   24:     publishRuntimeHealthObservation,
   25:   } from "./runtimeHealthEvents";
   26: 
```

### lib\chernobog\runtime\ollamaHealth.ts line 24

```text
   19:   import {
   20:     createRuntimeObservation,
   21:   } from "./runtimeHealth";
   22:   
   23:   import {
>  24:     publishRuntimeHealthObservation,
   25:   } from "./runtimeHealthEvents";
   26: 
   27:   interface OllamaTagsModel {
   28:     name?: unknown;
   29:     model?: unknown;
```

### lib\chernobog\runtime\ollamaHealth.ts line 25

```text
   20:     createRuntimeObservation,
   21:   } from "./runtimeHealth";
   22:   
   23:   import {
   24:     publishRuntimeHealthObservation,
>  25:   } from "./runtimeHealthEvents";
   26: 
   27:   interface OllamaTagsModel {
   28:     name?: unknown;
   29:     model?: unknown;
   30:   }
```

### lib\chernobog\runtime\ollamaHealth.ts line 54

```text
   49:       string[];
   50:   }
   51: 
   52:   export interface PublishedOllamaHealthResult
   53:   extends OllamaHealthResult {
>  54:   modelAvailability:
   55:     ModelAvailabilitySnapshot;
   56: }
   57:   
   58:   export interface ObserveAndPublishOllamaHealthOptions
   59:     extends OllamaHealthProbeOptions {
```

### lib\chernobog\runtime\ollamaHealth.ts line 55

```text
   50:   }
   51: 
   52:   export interface PublishedOllamaHealthResult
   53:   extends OllamaHealthResult {
   54:   modelAvailability:
>  55:     ModelAvailabilitySnapshot;
   56: }
   57:   
   58:   export interface ObserveAndPublishOllamaHealthOptions
   59:     extends OllamaHealthProbeOptions {
   60:     previousStatus?:
```

### lib\chernobog\runtime\ollamaHealth.ts line 344

```text
  339:     const result =
  340:       await probeOllamaHealth(
  341:         options
  342:       );
  343:   
> 344:     await publishRuntimeHealthObservation(
  345:       result.observation,
  346:       {
  347:         previousStatus:
  348:           options.previousStatus,
  349:       }
```

### lib\chernobog\runtime\ollamaHealth.ts line 352

```text
  347:         previousStatus:
  348:           options.previousStatus,
  349:       }
  350:     );
  351:   
> 352:     const modelAvailability =
  353:       buildModelAvailabilitySnapshot(
  354:         result.installedModels
  355:       );
  356:   
  357:     await publishModelAvailabilitySnapshot(
```

### lib\chernobog\runtime\ollamaHealth.ts line 353

```text
  348:           options.previousStatus,
  349:       }
  350:     );
  351:   
  352:     const modelAvailability =
> 353:       buildModelAvailabilitySnapshot(
  354:         result.installedModels
  355:       );
  356:   
  357:     await publishModelAvailabilitySnapshot(
  358:       modelAvailability,
```

### lib\chernobog\runtime\ollamaHealth.ts line 357

```text
  352:     const modelAvailability =
  353:       buildModelAvailabilitySnapshot(
  354:         result.installedModels
  355:       );
  356:   
> 357:     await publishModelAvailabilitySnapshot(
  358:       modelAvailability,
  359:       {
  360:         providerId:
  361:           result.observation.id,
  362:   
```

### lib\chernobog\runtime\ollamaHealth.ts line 358

```text
  353:       buildModelAvailabilitySnapshot(
  354:         result.installedModels
  355:       );
  356:   
  357:     await publishModelAvailabilitySnapshot(
> 358:       modelAvailability,
  359:       {
  360:         providerId:
  361:           result.observation.id,
  362:   
  363:         nodeId:
```

### lib\chernobog\runtime\ollamaHealth.ts line 370

```text
  365:       }
  366:     );
  367:   
  368:     return {
  369:       ...result,
> 370:       modelAvailability,
  371:     };
  372:   }
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 6

```text
    1: import { publishChernobogEventSafely } from "../events/publishers";
    2: 
    3: import type {
    4:   ChernobogHealthStatus,
    5:   ChernobogRuntimeObservation,
>   6: } from "./runtimeHealth";
    7: 
    8: export interface PublishRuntimeHealthOptions {
    9:   previousStatus?: ChernobogHealthStatus;
   10: }
   11: 
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 8

```text
    3: import type {
    4:   ChernobogHealthStatus,
    5:   ChernobogRuntimeObservation,
    6: } from "./runtimeHealth";
    7: 
>   8: export interface PublishRuntimeHealthOptions {
    9:   previousStatus?: ChernobogHealthStatus;
   10: }
   11: 
   12: function recovered(
   13:   previousStatus: ChernobogHealthStatus | undefined,
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 38

```text
   33:     capabilities: observation.capabilities,
   34:     observedAt: observation.observedAt,
   35:   };
   36: }
   37: 
>  38: export async function publishRuntimeHealthObservation(
   39:   observation: ChernobogRuntimeObservation,
   40:   options: PublishRuntimeHealthOptions = {}
   41: ): Promise<void> {
   42:   const payload =
   43:     buildCommonPayload(observation);
```

### lib\chernobog\runtime\runtimeHealthEvents.ts line 40

```text
   35:   };
   36: }
   37: 
   38: export async function publishRuntimeHealthObservation(
   39:   observation: ChernobogRuntimeObservation,
>  40:   options: PublishRuntimeHealthOptions = {}
   41: ): Promise<void> {
   42:   const payload =
   43:     buildCommonPayload(observation);
   44: 
   45:   await publishChernobogEventSafely({
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 4

```text
    1: import type {
    2:     ChernobogHealthStatus,
    3:     ChernobogRuntimeObservation,
>   4:   } from "./runtimeHealth";
    5:   
    6:   import {
    7:     createRuntimeObservation,
    8:   } from "./runtimeHealth";
    9:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 8

```text
    3:     ChernobogRuntimeObservation,
    4:   } from "./runtimeHealth";
    5:   
    6:   import {
    7:     createRuntimeObservation,
>   8:   } from "./runtimeHealth";
    9:   
   10:   import {
   11:     publishRuntimeHealthObservation,
   12:   } from "./runtimeHealthEvents";
   13:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 11

```text
    6:   import {
    7:     createRuntimeObservation,
    8:   } from "./runtimeHealth";
    9:   
   10:   import {
>  11:     publishRuntimeHealthObservation,
   12:   } from "./runtimeHealthEvents";
   13:   
   14:   export interface RuntimeHealthReportOptions {
   15:     previousStatus?: ChernobogHealthStatus;
   16:   }
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 12

```text
    7:     createRuntimeObservation,
    8:   } from "./runtimeHealth";
    9:   
   10:   import {
   11:     publishRuntimeHealthObservation,
>  12:   } from "./runtimeHealthEvents";
   13:   
   14:   export interface RuntimeHealthReportOptions {
   15:     previousStatus?: ChernobogHealthStatus;
   16:   }
   17:   
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 14

```text
    9:   
   10:   import {
   11:     publishRuntimeHealthObservation,
   12:   } from "./runtimeHealthEvents";
   13:   
>  14:   export interface RuntimeHealthReportOptions {
   15:     previousStatus?: ChernobogHealthStatus;
   16:   }
   17:   
   18:   export interface ServiceHealthReport {
   19:     id: string;
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 107

```text
  102:   }
  103:   
  104:   export async function reportServiceHealth(
  105:     report: ServiceHealthReport,
  106:     options:
> 107:       RuntimeHealthReportOptions = {}
  108:   ): Promise<ChernobogRuntimeObservation> {
  109:     const observation =
  110:       buildObservation(
  111:         "service",
  112:         report
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 115

```text
  110:       buildObservation(
  111:         "service",
  112:         report
  113:       );
  114:   
> 115:     await publishRuntimeHealthObservation(
  116:       observation,
  117:       {
  118:         previousStatus:
  119:           options.previousStatus,
  120:       }
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 129

```text
  124:   }
  125:   
  126:   export async function reportRuntimeNodeHealth(
  127:     report: RuntimeNodeHealthReport,
  128:     options:
> 129:       RuntimeHealthReportOptions = {}
  130:   ): Promise<ChernobogRuntimeObservation> {
  131:     const observation =
  132:       buildObservation(
  133:         "runtime-node",
  134:         report
```

### lib\chernobog\runtime\runtimeHealthReporters.ts line 137

```text
  132:       buildObservation(
  133:         "runtime-node",
  134:         report
  135:       );
  136:   
> 137:     await publishRuntimeHealthObservation(
  138:       observation,
  139:       {
  140:         previousStatus:
  141:           options.previousStatus,
  142:       }
```

### lib\chernobog\events\index.ts line 9

```text
    4: 
    5: const eventGlobals = globalThis as typeof globalThis & {
    6:   __chernobogEventBus?: ChernobogEventBus;
    7: };
    8: 
>   9: export function getChernobogEventBus(): ChernobogEventBus {
   10:   if (!eventGlobals.__chernobogEventBus) {
   11:     eventGlobals.__chernobogEventBus = new ChernobogEventBus({
   12:       store: new JsonlChernobogEventStore(),
   13:     });
   14:   }
```

### lib\chernobog\events\publishers.ts line 1

```text
>   1: import { getChernobogEventBus } from "./index";
    2: import { getChernobogEventContext } from "./eventContext";
    3: import {
    4:   ChernobogEventInput,
    5:   ChernobogEventPublishResult,
    6: } from "./types";
```

### lib\chernobog\events\publishers.ts line 66

```text
   61:   };
   62: 
   63:   try {
   64:     return await (
   65:       publisher ??
>  66:       getChernobogEventBus()
   67:     ).publish(enrichedInput);
   68:   } catch {
   69:     /*
   70:      * Telemetry is observational infrastructure.
   71:      *
```


## Event bus singleton and startup wiring

Pattern: `globalThis|singleton|getChernobogEvent|new ChernobogEventBus|subscribe\(|replay\(|bootstrap|startup|initialize|init`

### lib\chernobog\events\eventBus.ts line 88

```text
   83:     this.store = options.store;
   84:     this.dedupeWindowMs = Math.max(0, options.dedupeWindowMs ?? 30_000);
   85:     this.clock = options.clock ?? (() => new Date());
   86:   }
   87: 
>  88:   subscribe(
   89:     filter: ChernobogEventSubscriptionFilter,
   90:     handler: ChernobogEventHandler,
   91:   ): () => void {
   92:     const id = this.nextSubscriptionId++;
   93:     this.subscriptions.set(id, { id, filter, handler });
```

### lib\chernobog\events\eventBus.ts line 182

```text
  177:   Promise<ChernobogEventCorruptionRecoveryResult> {
  178:   return this.store
  179:     .recoverCorruption();
  180: }
  181: 
> 182:   async replay(
  183:     handler: ChernobogEventReplayHandler,
  184:     options:
  185:       ChernobogEventReplayOptions = {}
  186:   ): Promise<ChernobogEventReplayResult> {
  187:     const startedAt =
```

### lib\chernobog\events\eventContext.ts line 13

```text
    8:   tags?: string[];
    9: }
   10: 
   11: const eventContextStorage = new AsyncLocalStorage<ChernobogEventContext>();
   12: 
>  13: export function getChernobogEventContext():
   14:   | ChernobogEventContext
   15:   | undefined {
   16:   return eventContextStorage.getStore();
   17: }
   18: 
```

### lib\chernobog\events\index.ts line 5

```text
    1: import { ChernobogEventBus } from "./eventBus";
    2: import { JsonlChernobogEventStore } from "./store";
    3: 
    4: 
>   5: const eventGlobals = globalThis as typeof globalThis & {
    6:   __chernobogEventBus?: ChernobogEventBus;
    7: };
    8: 
    9: export function getChernobogEventBus(): ChernobogEventBus {
   10:   if (!eventGlobals.__chernobogEventBus) {
```

### lib\chernobog\events\index.ts line 9

```text
    4: 
    5: const eventGlobals = globalThis as typeof globalThis & {
    6:   __chernobogEventBus?: ChernobogEventBus;
    7: };
    8: 
>   9: export function getChernobogEventBus(): ChernobogEventBus {
   10:   if (!eventGlobals.__chernobogEventBus) {
   11:     eventGlobals.__chernobogEventBus = new ChernobogEventBus({
   12:       store: new JsonlChernobogEventStore(),
   13:     });
   14:   }
```

### lib\chernobog\events\index.ts line 11

```text
    6:   __chernobogEventBus?: ChernobogEventBus;
    7: };
    8: 
    9: export function getChernobogEventBus(): ChernobogEventBus {
   10:   if (!eventGlobals.__chernobogEventBus) {
>  11:     eventGlobals.__chernobogEventBus = new ChernobogEventBus({
   12:       store: new JsonlChernobogEventStore(),
   13:     });
   14:   }
   15: 
   16:   return eventGlobals.__chernobogEventBus;
```

### lib\chernobog\events\publishers.ts line 1

```text
>   1: import { getChernobogEventBus } from "./index";
    2: import { getChernobogEventContext } from "./eventContext";
    3: import {
    4:   ChernobogEventInput,
    5:   ChernobogEventPublishResult,
    6: } from "./types";
```

### lib\chernobog\events\publishers.ts line 2

```text
    1: import { getChernobogEventBus } from "./index";
>   2: import { getChernobogEventContext } from "./eventContext";
    3: import {
    4:   ChernobogEventInput,
    5:   ChernobogEventPublishResult,
    6: } from "./types";
    7: 
```

### lib\chernobog\events\publishers.ts line 32

```text
   27: 
   28: export async function publishChernobogEventSafely<TPayload>(
   29:   input: ChernobogEventInput<TPayload>,
   30:   publisher?: ChernobogEventPublisher
   31: ): Promise<ChernobogEventPublishResult | null> {
>  32:   const context = getChernobogEventContext();
   33: 
   34:   const enrichedInput: ChernobogEventInput<unknown> = {
   35:     ...input,
   36: 
   37:     subject:
```

### lib\chernobog\events\publishers.ts line 66

```text
   61:   };
   62: 
   63:   try {
   64:     return await (
   65:       publisher ??
>  66:       getChernobogEventBus()
   67:     ).publish(enrichedInput);
   68:   } catch {
   69:     /*
   70:      * Telemetry is observational infrastructure.
   71:      *
```

### lib\chernobog\events\retention.ts line 123

```text
  118:         resolveChernobogEventRetentionPolicy(),
  119:     now:
  120:       Date = new Date()
  121:   ): ChernobogEventRetentionResult {
  122:     if (
> 123:       !Number.isFinite(
  124:         policy.maxAgeMs
  125:       ) ||
  126:       policy.maxAgeMs <= 0
  127:     ) {
  128:       throw new Error(
```

### lib\chernobog\events\store.ts line 208

```text
  203:  *
  204:  * Valid events surrounding malformed JSONL
  205:  * records remain available to:
  206:  *
  207:  * - query()
> 208:  * - replay()
  209:  * - diagnostics
  210:  * - retention
  211:  *
  212:  * The exact corrupt lines remain available
  213:  * to recoverCorruption() for quarantine.
```

### app\globals.css line 52

```text
   47: }
   48: 
   49: .animate-code-rain {
   50:   animation-name: code-rain;
   51:   animation-timing-function: linear;
>  52:   animation-iteration-count: infinite;
   53:   will-change: transform;
   54:   backface-visibility: hidden;
   55:   transform: translateZ(0);
   56: }
   57: 
```

### app\globals.css line 79

```text
   74:   fill: rgba(255, 45, 30, 0.68);
   75:   filter: drop-shadow(0 0 5px rgba(255, 45, 30, 0.7));
   76: }
   77: 
   78: .eye-code-column {
>  79:   animation: eye-code-drift 8s linear infinite;
   80: }
   81: 
   82: .eye-code-column:nth-child(2n) {
   83:   animation-duration: 10s;
   84:   opacity: 0.7;
```

### app\globals.css line 103

```text
   98:     transform: translateY(18px);
   99:   }
  100: }
  101: 
  102: .chernobog-eye-active {
> 103:   animation: chernobog-eye-breathe 2.8s ease-in-out infinite;
  104: }
  105: 
  106: @keyframes chernobog-eye-breathe {
  107:   0%,
  108:   100% {
```

### app\api\discovery\itch\adult-preferences\route.ts line 5

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
    4: import { ItchAdultPreferenceProfileRepository } from "@/lib/modules/itch-discovery/repositories";
>   5: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
    6: 
    7: export const runtime = "nodejs";
    8: 
    9: export async function GET() {
   10:   const database = getItchDiscoveryDatabase();
```

### app\api\discovery\itch\adult-preferences\route.ts line 11

```text
    6: 
    7: export const runtime = "nodejs";
    8: 
    9: export async function GET() {
   10:   const database = getItchDiscoveryDatabase();
>  11:   bootstrapItchDiscovery(database);
   12:   const profiles = new ItchAdultPreferenceProfileRepository(database).listProfiles();
   13: 
   14:   return NextResponse.json({
   15:     profiles,
   16:     defaultProfileId: profiles.find((profile) => profile.isDefault)?.id ?? null,
```

### app\api\discovery\itch\adult-settings\route.ts line 3

```text
    1: import { NextResponse } from "next/server";
    2: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
>   3: import { apiFailureResponseInit, optionalBoolean, readJsonObject, toItchApiFailure } from "@/lib/modules/itch-discovery/api/http";
    4: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
    5: import { ItchAdultSettingsRepository } from "@/lib/modules/itch-discovery/repositories";
    6: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
    7: 
    8: export const runtime = "nodejs";
```

### app\api\discovery\itch\adult-settings\route.ts line 6

```text
    1: import { NextResponse } from "next/server";
    2: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
    3: import { apiFailureResponseInit, optionalBoolean, readJsonObject, toItchApiFailure } from "@/lib/modules/itch-discovery/api/http";
    4: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
    5: import { ItchAdultSettingsRepository } from "@/lib/modules/itch-discovery/repositories";
>   6: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
    7: 
    8: export const runtime = "nodejs";
    9: export const dynamic = "force-dynamic";
   10: 
   11: export async function GET() {
```

### app\api\discovery\itch\adult-settings\route.ts line 13

```text
    8: export const runtime = "nodejs";
    9: export const dynamic = "force-dynamic";
   10: 
   11: export async function GET() {
   12:   try {
>  13:     const db = getItchDiscoveryDatabase(); bootstrapItchDiscovery(db);
   14:     return NextResponse.json({ settings: new ItchAdultSettingsRepository(db).ensureDefault() });
   15:   } catch (error) { const failure = toItchApiFailure(error); return NextResponse.json(failure.body, apiFailureResponseInit(failure)); }
   16: }
   17: 
   18: export async function PATCH(request: Request) {
```

### app\api\discovery\itch\adult-settings\route.ts line 15

```text
   10: 
   11: export async function GET() {
   12:   try {
   13:     const db = getItchDiscoveryDatabase(); bootstrapItchDiscovery(db);
   14:     return NextResponse.json({ settings: new ItchAdultSettingsRepository(db).ensureDefault() });
>  15:   } catch (error) { const failure = toItchApiFailure(error); return NextResponse.json(failure.body, apiFailureResponseInit(failure)); }
   16: }
   17: 
   18: export async function PATCH(request: Request) {
   19:   try {
   20:     guardItchMutationRequest(request, "adult-settings:patch", { limit: 60, windowMs: 60000 });
```

### app\api\discovery\itch\adult-settings\route.ts line 33

```text
   28:       discreetNotifications: optionalBoolean(body.discreetNotifications, "discreetNotifications"),
   29:       hideExplicitTitles: optionalBoolean(body.hideExplicitTitles, "hideExplicitTitles"),
   30:       blockUnknownAgeContent: optionalBoolean(body.blockUnknownAgeContent, "blockUnknownAgeContent"),
   31:     });
   32:     return NextResponse.json({ settings });
>  33:   } catch (error) { const failure = toItchApiFailure(error); return NextResponse.json(failure.body, apiFailureResponseInit(failure)); }
   34: }
```

### app\api\discovery\itch\catalogue\route.ts line 6

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
    4: 
    5: import {
>   6:   apiFailureResponseInit,
    7:   isRecord,
    8:   optionalInteger,
    9:   optionalString,
   10:   readJsonObject,
   11:   toItchApiFailure,
```

### app\api\discovery\itch\catalogue\route.ts line 15

```text
   10:   readJsonObject,
   11:   toItchApiFailure,
   12: } from "@/lib/modules/itch-discovery/api/http";
   13: import type { ItchFilterRule, ItchFilterSort } from "@/lib/modules/itch-discovery/contract";
   14: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
>  15: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
   16: import {
   17:   executeItchFilter,
   18:   executeItchFilterPreset,
   19: } from "@/lib/modules/itch-discovery/services/executeItchFilter";
   20: 
```

### app\api\discovery\itch\catalogue\route.ts line 28

```text
   23: 
   24: export async function GET(request: Request) {
   25:   try {
   26:     const url = new URL(request.url);
   27:     const database = getItchDiscoveryDatabase();
>  28:     bootstrapItchDiscovery(database);
   29: 
   30:     return NextResponse.json(
   31:       executeItchFilterPreset(database, {
   32:         presetId: url.searchParams.get("presetId") ?? undefined,
   33:         presetName: url.searchParams.get("presetName") ?? undefined,
```

### app\api\discovery\itch\catalogue\route.ts line 41

```text
   36:         offset: parseQueryInteger(url.searchParams.get("offset"), "offset", 0, 100_000),
   37:       }),
   38:     );
   39:   } catch (error) {
   40:     const failure = toItchApiFailure(error);
>  41:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   42:   }
   43: }
   44: 
   45: export async function POST(request: Request) {
   46:   try {
```

### app\api\discovery\itch\catalogue\route.ts line 50

```text
   45: export async function POST(request: Request) {
   46:   try {
   47:     guardItchMutationRequest(request, "catalogue:post", { limit: 90, windowMs: 60000 });
   48:     const body = await readJsonObject(request);
   49:     const database = getItchDiscoveryDatabase();
>  50:     bootstrapItchDiscovery(database);
   51: 
   52:     return NextResponse.json(
   53:       executeItchFilter(database, {
   54:         rules: requireObjectArray(body.rules, "rules") as unknown as ItchFilterRule[],
   55:         sort: requireObjectArray(body.sort ?? [], "sort") as unknown as ItchFilterSort[],
```

### app\api\discovery\itch\catalogue\route.ts line 64

```text
   59:         now: optionalString(body.now, "now", { maximumLength: 40 }),
   60:       }),
   61:     );
   62:   } catch (error) {
   63:     const failure = toItchApiFailure(error);
>  64:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   65:   }
   66: }
   67: 
   68: function parseQueryInteger(
   69:   value: string | null,
```

### app\api\discovery\itch\command\route.ts line 5

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
    4: 
>   5: import { apiFailureResponseInit, requiredString, readJsonObject, toItchApiFailure } from "@/lib/modules/itch-discovery/api/http";
    6: import { tryHandleItchDiscoveryCommand } from "@/lib/modules/itch-discovery/commands";
    7: 
    8: export const runtime = "nodejs";
    9: export const dynamic = "force-dynamic";
   10: 
```

### app\api\discovery\itch\command\route.ts line 23

```text
   18:     return NextResponse.json(result, {
   19:       status: result.handled && !result.ok ? 400 : 200,
   20:     });
   21:   } catch (error) {
   22:     const failure = toItchApiFailure(error);
>  23:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   24:   }
   25: }
```

### app\api\discovery\itch\feed\route.ts line 4

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import { ITCH_RECOMMENDATION_STATES, type ItchRecommendationState } from "@/lib/modules/itch-discovery/contract";
>   4: import { apiFailureResponseInit, toItchApiFailure } from "@/lib/modules/itch-discovery/api/http";
    5: import { getItchRecommendationFeed } from "@/lib/modules/itch-discovery/services/getItchRecommendationFeed";
    6: 
    7: export const runtime = "nodejs";
    8: export const dynamic = "force-dynamic";
    9: 
```

### app\api\discovery\itch\feed\route.ts line 28

```text
   23:         offset: parseQueryInteger(url.searchParams.get("offset"), "offset", 0, 100000),
   24:       }),
   25:     );
   26:   } catch (error) {
   27:     const failure = toItchApiFailure(error);
>  28:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   29:   }
   30: }
   31: 
   32: function parseQueryInteger(value: string | null, field: string, minimum: number, maximum: number): number | undefined {
   33:   if (value === null || value === "") return undefined;
```

### app\api\discovery\itch\feedback\route.ts line 10

```text
    5: import {
    6:   ITCH_FEEDBACK_CANDIDATE_STATUSES,
    7:   type ItchFeedbackCandidateStatus,
    8: } from "@/lib/modules/itch-discovery/contract";
    9: import {
>  10:   apiFailureResponseInit,
   11:   isRecord,
   12:   optionalFiniteNumber,
   13:   optionalString,
   14:   readJsonObject,
   15:   requiredString,
```

### app\api\discovery\itch\feedback\route.ts line 12

```text
    7:   type ItchFeedbackCandidateStatus,
    8: } from "@/lib/modules/itch-discovery/contract";
    9: import {
   10:   apiFailureResponseInit,
   11:   isRecord,
>  12:   optionalFiniteNumber,
   13:   optionalString,
   14:   readJsonObject,
   15:   requiredString,
   16:   toItchApiFailure,
   17: } from "@/lib/modules/itch-discovery/api/http";
```

### app\api\discovery\itch\feedback\route.ts line 24

```text
   19: import {
   20:   ItchFeedbackRepository,
   21:   ItchPreferenceRepository,
   22: } from "@/lib/modules/itch-discovery/repositories";
   23: import { applyItchFeedbackLearning } from "@/lib/modules/itch-discovery/services/applyItchFeedbackLearning";
>  24: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
   25: import { recordItchPreferenceSignal } from "@/lib/modules/itch-discovery/services/recordItchPreferenceSignal";
   26: 
   27: export const runtime = "nodejs";
   28: export const dynamic = "force-dynamic";
   29: 
```

### app\api\discovery\itch\feedback\route.ts line 33

```text
   28: export const dynamic = "force-dynamic";
   29: 
   30: export async function GET(request: Request) {
   31:   try {
   32:     const database = getItchDiscoveryDatabase();
>  33:     bootstrapItchDiscovery(database);
   34:     const url = new URL(request.url);
   35:     const preferences = new ItchPreferenceRepository(database);
   36:     const profile = url.searchParams.get("profileId")
   37:       ? preferences.findProfileById(url.searchParams.get("profileId")!)
   38:       : preferences.findProfileByName("Default") ?? preferences.ensureDefaultProfile();
```

### app\api\discovery\itch\feedback\route.ts line 59

```text
   54:       candidates: feedback.listCandidates(profile.id, rawStatus ?? undefined),
   55:       appliedSignals: feedback.countAppliedSignals(profile.id),
   56:     });
   57:   } catch (error) {
   58:     const failure = toItchApiFailure(error);
>  59:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   60:   }
   61: }
   62: 
   63: export async function POST(request: Request) {
   64:   try {
```

### app\api\discovery\itch\feedback\route.ts line 91

```text
   86:         body.recommendationId,
   87:         "recommendationId",
   88:       ),
   89:       profileId: optionalString(body.profileId, "profileId"),
   90:       signalType,
>  91:       signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
   92:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   93:     });
   94:     return NextResponse.json(result, { status: result.signalCreated ? 201 : 200 });
   95:   } catch (error) {
   96:     const failure = toItchApiFailure(error);
```

### app\api\discovery\itch\feedback\route.ts line 97

```text
   92:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   93:     });
   94:     return NextResponse.json(result, { status: result.signalCreated ? 201 : 200 });
   95:   } catch (error) {
   96:     const failure = toItchApiFailure(error);
>  97:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   98:   }
   99: }
  100: 
  101: export async function PATCH(request: Request) {
  102:   try {
```

### app\api\discovery\itch\feedback\route.ts line 110

```text
  105:     const status = requiredString(body.status, "status") as ItchFeedbackCandidateStatus;
  106:     if (!ITCH_FEEDBACK_CANDIDATE_STATUSES.includes(status)) {
  107:       throw new TypeError(`Unsupported feedback candidate status: ${status}`);
  108:     }
  109:     const database = getItchDiscoveryDatabase();
> 110:     bootstrapItchDiscovery(database);
  111:     const candidate = new ItchFeedbackRepository(database).updateCandidateStatus(
  112:       requiredString(body.id, "id"),
  113:       status,
  114:     );
  115:     if (!candidate) {
```

### app\api\discovery\itch\feedback\route.ts line 124

```text
  119:       );
  120:     }
  121:     return NextResponse.json({ candidate });
  122:   } catch (error) {
  123:     const failure = toItchApiFailure(error);
> 124:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  125:   }
  126: }
```

### app\api\discovery\itch\filters\route.ts line 7

```text
    2: 
    3: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
    4: 
    5: import type { ItchFilterRule, ItchFilterSort } from "@/lib/modules/itch-discovery/contract";
    6: import {
>   7:   apiFailureResponseInit,
    8:   isRecord,
    9:   optionalBoolean,
   10:   optionalString,
   11:   readJsonObject,
   12:   requiredString,
```

### app\api\discovery\itch\filters\route.ts line 17

```text
   12:   requiredString,
   13:   toItchApiFailure,
   14: } from "@/lib/modules/itch-discovery/api/http";
   15: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
   16: import { ItchFilterPresetRepository } from "@/lib/modules/itch-discovery/repositories";
>  17: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
   18: 
   19: export const runtime = "nodejs";
   20: export const dynamic = "force-dynamic";
   21: 
   22: export async function GET() {
```

### app\api\discovery\itch\filters\route.ts line 25

```text
   20: export const dynamic = "force-dynamic";
   21: 
   22: export async function GET() {
   23:   try {
   24:     const database = getItchDiscoveryDatabase();
>  25:     bootstrapItchDiscovery(database);
   26:     return NextResponse.json({ presets: new ItchFilterPresetRepository(database).listAll() });
   27:   } catch (error) {
   28:     const failure = toItchApiFailure(error);
   29:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   30:   }
```

### app\api\discovery\itch\filters\route.ts line 29

```text
   24:     const database = getItchDiscoveryDatabase();
   25:     bootstrapItchDiscovery(database);
   26:     return NextResponse.json({ presets: new ItchFilterPresetRepository(database).listAll() });
   27:   } catch (error) {
   28:     const failure = toItchApiFailure(error);
>  29:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   30:   }
   31: }
   32: 
   33: export async function POST(request: Request) {
   34:   try {
```

### app\api\discovery\itch\filters\route.ts line 39

```text
   34:   try {
   35:     guardItchMutationRequest(request, "filters:post", { limit: 90, windowMs: 60000 });
   36:     const body = await readJsonObject(request);
   37:     const action = optionalString(body.action, "action") ?? "upsert";
   38:     const database = getItchDiscoveryDatabase();
>  39:     bootstrapItchDiscovery(database);
   40:     const presets = new ItchFilterPresetRepository(database);
   41: 
   42:     if (action === "upsert") {
   43:       const presetBody = isRecord(body.preset) ? body.preset : body;
   44:       const rules = requireObjectArray(presetBody.rules, "rules") as unknown as ItchFilterRule[];
```

### app\api\discovery\itch\filters\route.ts line 81

```text
   76:     }
   77: 
   78:     throw new TypeError(`Unsupported filter action: ${action}`);
   79:   } catch (error) {
   80:     const failure = toItchApiFailure(error);
>  81:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   82:   }
   83: }
   84: 
   85: function requireObjectArray(value: unknown, field: string): Record<string, unknown>[] {
   86:   if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
```

### app\api\discovery\itch\maintenance\route.ts line 4

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import {
>   4:   apiFailureResponseInit,
    5:   optionalInteger,
    6:   optionalString,
    7:   readJsonObject,
    8:   toItchApiFailure,
    9: } from "@/lib/modules/itch-discovery/api/http";
```

### app\api\discovery\itch\maintenance\route.ts line 29

```text
   24:       diagnostics: runItchDiagnostics(),
   25:       backups: listItchDatabaseBackups(),
   26:     });
   27:   } catch (error) {
   28:     const failure = toItchApiFailure(error);
>  29:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   30:   }
   31: }
   32: 
   33: export async function POST(request: Request) {
   34:   try {
```

### app\api\discovery\itch\maintenance\route.ts line 61

```text
   56:     }
   57: 
   58:     throw new TypeError(`Unsupported maintenance action: ${action}`);
   59:   } catch (error) {
   60:     const failure = toItchApiFailure(error);
>  61:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   62:   }
   63: }
```

### app\api\discovery\itch\notifications\route.ts line 10

```text
    5: import {
    6:   ITCH_NOTIFICATION_STATES,
    7:   type ItchNotificationState,
    8: } from "@/lib/modules/itch-discovery/contract";
    9: import {
>  10:   apiFailureResponseInit,
   11:   optionalInteger,
   12:   optionalString,
   13:   readJsonObject,
   14:   requiredString,
   15:   toItchApiFailure,
```

### app\api\discovery\itch\notifications\route.ts line 23

```text
   18: import {
   19:   ItchAdultSettingsRepository,
   20:   ItchNotificationDigestRepository,
   21:   ItchNotificationRepository,
   22: } from "@/lib/modules/itch-discovery/repositories";
>  23: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
   24: import { buildItchNotificationDigest } from "@/lib/modules/itch-discovery/services/buildItchNotificationDigest";
   25: 
   26: export const runtime = "nodejs";
   27: export const dynamic = "force-dynamic";
   28: 
```

### app\api\discovery\itch\notifications\route.ts line 42

```text
   37:     const limit = limitValue ? Number(limitValue) : 100;
   38:     if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
   39:       throw new TypeError("limit must be an integer from 1 to 500.");
   40:     }
   41:     const database = getItchDiscoveryDatabase();
>  42:     bootstrapItchDiscovery(database);
   43:     const notifications = new ItchNotificationRepository(database);
   44:     const adult = new ItchAdultSettingsRepository(database).ensureDefault();
   45:     const listed = notifications.list(rawState as ItchNotificationState | undefined, limit);
   46:     const safeNotifications = adult.discreetNotifications
   47:       ? listed.map((item) => ({ ...item, title: "Game update available", body: "A watched adult game has new activity." }))
```

### app\api\discovery\itch\notifications\route.ts line 56

```text
   51:       unreadCount: notifications.countUnread(),
   52:       digests: new ItchNotificationDigestRepository(database).list(30),
   53:     });
   54:   } catch (error) {
   55:     const failure = toItchApiFailure(error);
>  56:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   57:   }
   58: }
   59: 
   60: export async function PATCH(request: Request) {
   61:   try {
```

### app\api\discovery\itch\notifications\route.ts line 67

```text
   62:     guardItchMutationRequest(request, "notifications:patch", { limit: 90, windowMs: 60000 });
   63:     const body = await readJsonObject(request);
   64:     const id = requiredString(body.id, "id");
   65:     const action = requiredString(body.action, "action");
   66:     const database = getItchDiscoveryDatabase();
>  67:     bootstrapItchDiscovery(database);
   68:     const notifications = new ItchNotificationRepository(database);
   69:     const notification = action === "read"
   70:       ? notifications.markRead(id)
   71:       : action === "opened"
   72:         ? notifications.markOpened(id)
```

### app\api\discovery\itch\notifications\route.ts line 82

```text
   77:       return NextResponse.json({ error: "Notification not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
   78:     }
   79:     return NextResponse.json({ notification });
   80:   } catch (error) {
   81:     const failure = toItchApiFailure(error);
>  82:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   83:   }
   84: }
   85: 
   86: export async function POST(request: Request) {
   87:   try {
```

### app\api\discovery\itch\notifications\route.ts line 97

```text
   92:       timezone: optionalString(body.timezone, "timezone", { maximumLength: 100 }),
   93:     });
   94:     return NextResponse.json(result);
   95:   } catch (error) {
   96:     const failure = toItchApiFailure(error);
>  97:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   98:   }
   99: }
```

### app\api\discovery\itch\recommendations\route.ts line 12

```text
    7:   ITCH_SIGNAL_TYPES,
    8:   type ItchRecommendationState,
    9:   type ItchSignalType,
   10: } from "@/lib/modules/itch-discovery/contract";
   11: import {
>  12:   apiFailureResponseInit,
   13:   optionalFiniteNumber,
   14:   optionalString,
   15:   readJsonObject,
   16:   requiredString,
   17:   toItchApiFailure,
```

### app\api\discovery\itch\recommendations\route.ts line 13

```text
    8:   type ItchRecommendationState,
    9:   type ItchSignalType,
   10: } from "@/lib/modules/itch-discovery/contract";
   11: import {
   12:   apiFailureResponseInit,
>  13:   optionalFiniteNumber,
   14:   optionalString,
   15:   readJsonObject,
   16:   requiredString,
   17:   toItchApiFailure,
   18:   isRecord,
```

### app\api\discovery\itch\recommendations\route.ts line 36

```text
   31: 
   32:     const result = recordItchRecommendationAction({
   33:       recommendationId: requiredString(body.recommendationId, "recommendationId"),
   34:       state,
   35:       signalType,
>  36:       signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
   37:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   38:     });
   39:     return NextResponse.json(result);
   40:   } catch (error) {
   41:     const failure = toItchApiFailure(error);
```

### app\api\discovery\itch\recommendations\route.ts line 42

```text
   37:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   38:     });
   39:     return NextResponse.json(result);
   40:   } catch (error) {
   41:     const failure = toItchApiFailure(error);
>  42:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   43:   }
   44: }
   45: 
   46: export async function POST(request: Request) {
   47:   try {
```

### app\api\discovery\itch\recommendations\route.ts line 57

```text
   52:     const result = recordItchGameAction({
   53:       gameId: requiredString(body.gameId, "gameId"),
   54:       profileId: optionalString(body.profileId, "profileId"),
   55:       state,
   56:       signalType,
>  57:       signalValue: optionalFiniteNumber(body.signalValue, "signalValue"),
   58:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   59:     });
   60:     return NextResponse.json(result, { status: 201 });
   61:   } catch (error) {
   62:     const failure = toItchApiFailure(error);
```

### app\api\discovery\itch\recommendations\route.ts line 63

```text
   58:       metadata: isRecord(body.metadata) ? body.metadata : undefined,
   59:     });
   60:     return NextResponse.json(result, { status: 201 });
   61:   } catch (error) {
   62:     const failure = toItchApiFailure(error);
>  63:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   64:   }
   65: }
   66: 
   67: function readAction(body: Record<string, unknown>): {
   68:   state: ItchRecommendationState;
```

### app\api\discovery\itch\refresh\route.ts line 6

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
    4: 
    5: import {
>   6:   apiFailureResponseInit,
    7:   optionalBoolean,
    8:   optionalInteger,
    9:   optionalString,
   10:   readJsonObject,
   11:   toItchApiFailure,
```

### app\api\discovery\itch\refresh\route.ts line 19

```text
   14: import { runItchDiscoveryPipeline } from "@/lib/modules/itch-discovery/services/runItchDiscoveryPipeline";
   15: 
   16: export const runtime = "nodejs";
   17: export const dynamic = "force-dynamic";
   18: 
>  19: const TRIGGERS = new Set<ItchRefreshTrigger>(["manual", "schedule", "startup-stale"]);
   20: 
   21: export async function POST(request: Request) {
   22:   try {
   23:     guardItchMutationRequest(request, "refresh:post", { limit: 4, windowMs: 600000 });
   24:     const body = await readJsonObject(request);
```

### app\api\discovery\itch\refresh\route.ts line 57

```text
   52:     });
   53: 
   54:     return NextResponse.json(result, { status: result.run.status === "failed" ? 500 : 200 });
   55:   } catch (error) {
   56:     const failure = toItchApiFailure(error);
>  57:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   58:   }
   59: }
```

### app\api\discovery\itch\scheduler\route.ts line 6

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
    4: 
    5: import {
>   6:   apiFailureResponseInit,
    7:   optionalBoolean,
    8:   optionalInteger,
    9:   optionalString,
   10:   readJsonObject,
   11:   toItchApiFailure,
```

### app\api\discovery\itch\scheduler\route.ts line 15

```text
   10:   readJsonObject,
   11:   toItchApiFailure,
   12: } from "@/lib/modules/itch-discovery/api/http";
   13: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
   14: import { ItchSchedulerRepository } from "@/lib/modules/itch-discovery/repositories";
>  15: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
   16: import {
   17:   getItchScheduleDecision,
   18:   runItchScheduledRefresh,
   19: } from "@/lib/modules/itch-discovery/services/runItchScheduledRefresh";
   20: 
```

### app\api\discovery\itch\scheduler\route.ts line 27

```text
   22: export const dynamic = "force-dynamic";
   23: 
   24: export async function GET() {
   25:   try {
   26:     const database = getItchDiscoveryDatabase();
>  27:     bootstrapItchDiscovery(database);
   28:     return NextResponse.json({
   29:       settings: new ItchSchedulerRepository(database).ensureDefault(),
   30:       decision: getItchScheduleDecision({ mode: "schedule" }, database),
   31:     });
   32:   } catch (error) {
```

### app\api\discovery\itch\scheduler\route.ts line 34

```text
   29:       settings: new ItchSchedulerRepository(database).ensureDefault(),
   30:       decision: getItchScheduleDecision({ mode: "schedule" }, database),
   31:     });
   32:   } catch (error) {
   33:     const failure = toItchApiFailure(error);
>  34:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   35:   }
   36: }
   37: 
   38: export async function PATCH(request: Request) {
   39:   try {
```

### app\api\discovery\itch\scheduler\route.ts line 43

```text
   38: export async function PATCH(request: Request) {
   39:   try {
   40:     guardItchMutationRequest(request, "scheduler:patch", { limit: 12, windowMs: 600000 });
   41:     const body = await readJsonObject(request);
   42:     const database = getItchDiscoveryDatabase();
>  43:     bootstrapItchDiscovery(database);
   44:     const settings = new ItchSchedulerRepository(database).update({
   45:       enabled: optionalBoolean(body.enabled, "enabled"),
   46:       intervalHours: optionalInteger(body.intervalHours, "intervalHours", {
   47:         minimum: 1,
   48:         maximum: 720,
```

### app\api\discovery\itch\scheduler\route.ts line 63

```text
   58:         { minimum: 0, maximum: 23 },
   59:       ),
   60:       timezone: optionalString(body.timezone, "timezone", {
   61:         maximumLength: 100,
   62:       }),
>  63:       runOnStartup: optionalBoolean(body.runOnStartup, "runOnStartup"),
   64:     });
   65:     return NextResponse.json({
   66:       settings,
   67:       decision: getItchScheduleDecision({ mode: "schedule" }, database),
   68:     });
```

### app\api\discovery\itch\scheduler\route.ts line 71

```text
   66:       settings,
   67:       decision: getItchScheduleDecision({ mode: "schedule" }, database),
   68:     });
   69:   } catch (error) {
   70:     const failure = toItchApiFailure(error);
>  71:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   72:   }
   73: }
   74: 
   75: export async function POST(request: Request) {
   76:   try {
```

### app\api\discovery\itch\scheduler\route.ts line 80

```text
   75: export async function POST(request: Request) {
   76:   try {
   77:     guardItchMutationRequest(request, "scheduler:post", { limit: 12, windowMs: 600000 });
   78:     const body = await readJsonObject(request);
   79:     const mode = optionalString(body.mode, "mode") ?? "schedule";
>  80:     if (mode !== "schedule" && mode !== "startup-stale") {
   81:       throw new TypeError(`Unsupported scheduler mode: ${mode}`);
   82:     }
   83:     const result = await runItchScheduledRefresh({
   84:       mode,
   85:       force: optionalBoolean(body.force, "force"),
```

### app\api\discovery\itch\scheduler\route.ts line 92

```text
   87:     return NextResponse.json(result, {
   88:       status: result.pipeline?.run.status === "failed" ? 500 : 200,
   89:     });
   90:   } catch (error) {
   91:     const failure = toItchApiFailure(error);
>  92:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   93:   }
   94: }
```

### app\api\discovery\itch\settings\route.ts line 7

```text
    2: 
    3: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
    4: 
    5: import type { ItchPlatform } from "@/lib/modules/itch-discovery/contract";
    6: import {
>   7:   apiFailureResponseInit,
    8:   optionalBoolean,
    9:   optionalFiniteNumber,
   10:   optionalInteger,
   11:   optionalString,
   12:   readJsonObject,
```

### app\api\discovery\itch\settings\route.ts line 9

```text
    4: 
    5: import type { ItchPlatform } from "@/lib/modules/itch-discovery/contract";
    6: import {
    7:   apiFailureResponseInit,
    8:   optionalBoolean,
>   9:   optionalFiniteNumber,
   10:   optionalInteger,
   11:   optionalString,
   12:   readJsonObject,
   13:   toItchApiFailure,
   14: } from "@/lib/modules/itch-discovery/api/http";
```

### app\api\discovery\itch\settings\route.ts line 20

```text
   15: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
   16: import {
   17:   ItchFilterPresetRepository,
   18:   ItchPreferenceRepository,
   19: } from "@/lib/modules/itch-discovery/repositories";
>  20: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
   21: 
   22: export const runtime = "nodejs";
   23: export const dynamic = "force-dynamic";
   24: 
   25: const PLATFORMS = new Set<ItchPlatform>(["windows", "linux", "macos", "browser"]);
```

### app\api\discovery\itch\settings\route.ts line 30

```text
   25: const PLATFORMS = new Set<ItchPlatform>(["windows", "linux", "macos", "browser"]);
   26: 
   27: export async function GET(request: Request) {
   28:   try {
   29:     const database = getItchDiscoveryDatabase();
>  30:     bootstrapItchDiscovery(database);
   31:     const preferences = new ItchPreferenceRepository(database);
   32:     const url = new URL(request.url);
   33:     const profile = url.searchParams.get("profileId")
   34:       ? preferences.findProfileById(url.searchParams.get("profileId")!)
   35:       : preferences.findProfileByName("Default") ?? preferences.ensureDefaultProfile();
```

### app\api\discovery\itch\settings\route.ts line 46

```text
   41:       weights: preferences.listWeights(profile.id),
   42:       presets: new ItchFilterPresetRepository(database).listAll(),
   43:     });
   44:   } catch (error) {
   45:     const failure = toItchApiFailure(error);
>  46:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   47:   }
   48: }
   49: 
   50: export async function PATCH(request: Request) {
   51:   try {
```

### app\api\discovery\itch\settings\route.ts line 55

```text
   50: export async function PATCH(request: Request) {
   51:   try {
   52:     guardItchMutationRequest(request, "settings:patch", { limit: 90, windowMs: 60000 });
   53:     const body = await readJsonObject(request);
   54:     const database = getItchDiscoveryDatabase();
>  55:     bootstrapItchDiscovery(database);
   56:     const preferences = new ItchPreferenceRepository(database);
   57:     const current = optionalString(body.id, "id")
   58:       ? preferences.findProfileById(optionalString(body.id, "id")!)
   59:       : preferences.findProfileByName(optionalString(body.profileName, "profileName") ?? "Default") ?? preferences.ensureDefaultProfile();
   60:     if (!current) {
```

### app\api\discovery\itch\settings\route.ts line 81

```text
   76:       maximumPriceMinor,
   77:       allowFree: optionalBoolean(body.allowFree, "allowFree") ?? current.allowFree,
   78:       allowPaid: optionalBoolean(body.allowPaid, "allowPaid") ?? current.allowPaid,
   79:       allowBrowserGames: optionalBoolean(body.allowBrowserGames, "allowBrowserGames") ?? current.allowBrowserGames,
   80:       excludeNsfw: optionalBoolean(body.excludeNsfw, "excludeNsfw") ?? current.excludeNsfw,
>  81:       minimumScore: optionalFiniteNumber(body.minimumScore, "minimumScore") ?? current.minimumScore,
   82:     });
   83:     return NextResponse.json({ profile, weights: preferences.listWeights(profile.id) });
   84:   } catch (error) {
   85:     const failure = toItchApiFailure(error);
   86:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
```

### app\api\discovery\itch\settings\route.ts line 86

```text
   81:       minimumScore: optionalFiniteNumber(body.minimumScore, "minimumScore") ?? current.minimumScore,
   82:     });
   83:     return NextResponse.json({ profile, weights: preferences.listWeights(profile.id) });
   84:   } catch (error) {
   85:     const failure = toItchApiFailure(error);
>  86:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   87:   }
   88: }
   89: 
   90: function parsePlatforms(value: unknown): ItchPlatform[] {
   91:   if (!Array.isArray(value)) throw new TypeError("preferredPlatforms must be an array.");
```

### app\api\discovery\itch\status\route.ts line 3

```text
    1: import { NextResponse } from "next/server";
    2: 
>   3: import { apiFailureResponseInit, toItchApiFailure } from "@/lib/modules/itch-discovery/api/http";
    4: import { getItchDiscoveryStatus } from "@/lib/modules/itch-discovery/services/getItchDiscoveryStatus";
    5: 
    6: export const runtime = "nodejs";
    7: export const dynamic = "force-dynamic";
    8: 
```

### app\api\discovery\itch\status\route.ts line 14

```text
    9: export async function GET() {
   10:   try {
   11:     return NextResponse.json(getItchDiscoveryStatus());
   12:   } catch (error) {
   13:     const failure = toItchApiFailure(error);
>  14:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   15:   }
   16: }
```

### app\api\discovery\itch\taxonomy\route.ts line 5

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
    4: import {
>   5:   apiFailureResponseInit,
    6:   optionalString,
    7:   readJsonObject,
    8:   toItchApiFailure,
    9: } from "@/lib/modules/itch-discovery/api/http";
   10: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
```

### app\api\discovery\itch\taxonomy\route.ts line 12

```text
    7:   readJsonObject,
    8:   toItchApiFailure,
    9: } from "@/lib/modules/itch-discovery/api/http";
   10: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
   11: import { ItchAdultTaxonomyRepository } from "@/lib/modules/itch-discovery/repositories";
>  12: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
   13: import { reclassifyItchAdultTaxonomy } from "@/lib/modules/itch-discovery/services/reclassifyItchAdultTaxonomy";
   14: 
   15: export const runtime = "nodejs";
   16: export const dynamic = "force-dynamic";
   17: 
```

### app\api\discovery\itch\taxonomy\route.ts line 21

```text
   16: export const dynamic = "force-dynamic";
   17: 
   18: export async function GET(request: Request) {
   19:   try {
   20:     const database = getItchDiscoveryDatabase();
>  21:     bootstrapItchDiscovery(database);
   22:     const repository = new ItchAdultTaxonomyRepository(database);
   23:     const url = new URL(request.url);
   24:     const status = optionalString(url.searchParams.get("uncategorisedStatus"), "uncategorisedStatus");
   25:     const snapshot = repository.getSnapshot();
   26:     return NextResponse.json({
```

### app\api\discovery\itch\taxonomy\route.ts line 34

```text
   29:         ? repository.listUncategorised(status)
   30:         : snapshot.uncategorised,
   31:     });
   32:   } catch (error) {
   33:     const failure = toItchApiFailure(error);
>  34:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   35:   }
   36: }
   37: 
   38: export async function POST(request: Request) {
   39:   try {
```

### app\api\discovery\itch\taxonomy\route.ts line 52

```text
   47:       throw new TypeError(`Unsupported taxonomy action: ${action}`);
   48:     }
   49:     return NextResponse.json(reclassifyItchAdultTaxonomy());
   50:   } catch (error) {
   51:     const failure = toItchApiFailure(error);
>  52:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   53:   }
   54: }
```

### app\api\discovery\itch\watches\route.ts line 6

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
    4: 
    5: import {
>   6:   apiFailureResponseInit,
    7:   optionalBoolean,
    8:   optionalString,
    9:   readJsonObject,
   10:   toItchApiFailure,
   11: } from "@/lib/modules/itch-discovery/api/http";
```

### app\api\discovery\itch\watches\route.ts line 14

```text
    9:   readJsonObject,
   10:   toItchApiFailure,
   11: } from "@/lib/modules/itch-discovery/api/http";
   12: import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
   13: import { ItchWatchRepository } from "@/lib/modules/itch-discovery/repositories";
>  14: import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
   15: import { unwatchItchGame, watchItchGame } from "@/lib/modules/itch-discovery/services/watchItchGame";
   16: 
   17: export const runtime = "nodejs";
   18: export const dynamic = "force-dynamic";
   19: 
```

### app\api\discovery\itch\watches\route.ts line 23

```text
   18: export const dynamic = "force-dynamic";
   19: 
   20: export async function GET() {
   21:   try {
   22:     const database = getItchDiscoveryDatabase();
>  23:     bootstrapItchDiscovery(database);
   24:     return NextResponse.json({ watches: new ItchWatchRepository(database).listAll() });
   25:   } catch (error) {
   26:     const failure = toItchApiFailure(error);
   27:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   28:   }
```

### app\api\discovery\itch\watches\route.ts line 27

```text
   22:     const database = getItchDiscoveryDatabase();
   23:     bootstrapItchDiscovery(database);
   24:     return NextResponse.json({ watches: new ItchWatchRepository(database).listAll() });
   25:   } catch (error) {
   26:     const failure = toItchApiFailure(error);
>  27:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   28:   }
   29: }
   30: 
   31: export async function POST(request: Request) {
   32:   try {
```

### app\api\discovery\itch\watches\route.ts line 53

```text
   48:         ? unwatchItchGame(input)
   49:         : (() => { throw new TypeError(`Unsupported watch action: ${action}`); })();
   50:     return NextResponse.json(result);
   51:   } catch (error) {
   52:     const failure = toItchApiFailure(error);
>  53:     return NextResponse.json(failure.body, apiFailureResponseInit(failure));
   54:   }
   55: }
```

### app\api\events\route.ts line 4

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import {
>   4:   getChernobogEventBus,
    5:   type ChernobogEventQuery,
    6: } from "@/lib/chernobog/events";
    7: 
    8: export const runtime = "nodejs";
    9: export const dynamic = "force-dynamic";
```

### app\api\events\route.ts line 298

```text
  293:       buildEventQuery(
  294:         request
  295:       );
  296: 
  297:     const events =
> 298:       await getChernobogEventBus()
  299:         .query(
  300:           query
  301:         );
  302: 
  303:     return NextResponse.json(
```

### app\api\events\diagnostics\route.ts line 4

```text
    1: import { NextResponse } from "next/server";
    2: 
    3: import {
>   4:   getChernobogEventBus,
    5: } from "@/lib/chernobog/events";
    6: 
    7: export const runtime = "nodejs";
    8: export const dynamic = "force-dynamic";
    9: 
```

### app\api\events\diagnostics\route.ts line 17

```text
   12: };
   13: 
   14: export async function GET() {
   15:   try {
   16:     const diagnostics =
>  17:       await getChernobogEventBus()
   18:         .getDiagnostics();
   19: 
   20:     return NextResponse.json(
   21:       {
   22:         ok: true,
```

### app\api\vault\answer\route.ts line 45

```text
   40:   return typeof value === "boolean" ? value : undefined;
   41: }
   42: 
   43: function getOptionalNumber(body: JsonObject, key: string): number | undefined {
   44:   const value = body[key];
>  45:   return typeof value === "number" && Number.isFinite(value)
   46:     ? value
   47:     : undefined;
   48: }
   49: 
   50: function getStringArray(body: JsonObject, key: string): string[] | undefined {
```

### app\api\vault\briefing\route.ts line 6

```text
    1: import { NextResponse } from "next/server";
    2: import { generateCurrentStateBriefing } from "@/lib/modules/vault-brain/currentStateBriefing";
    3: import type { CurrentStateBriefingRequest } from "@/lib/modules/vault-brain/currentStateBriefingTypes";
    4: 
    5: function parseLimit(value: unknown): number | undefined {
>   6:   if (typeof value !== "number" || !Number.isFinite(value)) {
    7:     return undefined;
    8:   }
    9: 
   10:   return value;
   11: }
```

### app\api\vault\recall\route.ts line 32

```text
   27:     : undefined;
   28: }
   29: 
   30: function getOptionalNumber(body: JsonObject, key: string) {
   31:   const value = body[key];
>  32:   return typeof value === "number" && Number.isFinite(value)
   33:     ? value
   34:     : undefined;
   35: }
   36: 
   37: function parseRecallRequest(body: unknown): StructuredVaultRecallRequest {
```

### app\modules\character-forge\page.tsx line 43

```text
   38:         <section className={styles.hero}>
   39:           <div className={styles.heroCopy}>
   40:             <p className={styles.eyebrow}>Chernobog creative systems</p>
   41:             <h1 className={styles.title}>Character Forge</h1>
   42:             <p className={styles.heroText}>
>  43:               Direct characters from initial intent through concept approval,
   44:               model production, rig validation, and Unity-ready export.
   45:             </p>
   46:           </div>
   47: 
   48:           <div className={styles.heroActions}>
```

### app\modules\character-forge\[projectId]\page.tsx line 88

```text
   83:   const nextGate =
   84:     project.status === "draft"
   85:       ? {
   86:           title: "Structured Brief",
   87:           description:
>  88:             "Generate the editable production definition from the source prompt, then review it field by field.",
   89:           marker: "Ready to generate",
   90:         }
   91:       : project.status === "brief_draft"
   92:         ? {
   93:             title: "Brief Approval",
```

### app\modules\character-forge\[projectId]\page.tsx line 102

```text
   97:           }
   98:         : project.status === "brief_ready"
   99:           ? {
  100:               title: "Concept Generation",
  101:               description:
> 102:                 "The brief gate is complete. Generate four visually distinct candidates from the approved production definition.",
  103:               marker: "Ready to generate",
  104:             }
  105:           : project.status === "concepts_generating"
  106:             ? {
  107:                 title: "Concept Generation",
```

### app\modules\character-forge\[projectId]\page.tsx line 263

```text
  258: 
  259:         <section className={styles.workspaceGrid}>
  260:           <CharacterProjectEditor
  261:             key={project.updatedAt}
  262:             projectId={project.id}
> 263:             initialName={project.name}
  264:             initialPrompt={project.originalPrompt}
  265:             status={project.status}
  266:           />
  267: 
  268:           <aside className={styles.workspaceSidebar}>
```

### app\modules\character-forge\[projectId]\page.tsx line 264

```text
  259:         <section className={styles.workspaceGrid}>
  260:           <CharacterProjectEditor
  261:             key={project.updatedAt}
  262:             projectId={project.id}
  263:             initialName={project.name}
> 264:             initialPrompt={project.originalPrompt}
  265:             status={project.status}
  266:           />
  267: 
  268:           <aside className={styles.workspaceSidebar}>
  269:             <section className={styles.nextStagePanel}>
```

### app\modules\character-forge\[projectId]\page.tsx line 339

```text
  334: 
  335:         <CharacterBriefWorkspace
  336:           projectId={project.id}
  337:           projectName={project.name}
  338:           sourcePrompt={project.originalPrompt}
> 339:           initialBrief={project.brief}
  340:           initialStatus={project.status}
  341:         />
  342: 
  343:         <CharacterConceptWorkspace
  344:           projectId={project.id}
```

### app\modules\character-forge\[projectId]\page.tsx line 340

```text
  335:         <CharacterBriefWorkspace
  336:           projectId={project.id}
  337:           projectName={project.name}
  338:           sourcePrompt={project.originalPrompt}
  339:           initialBrief={project.brief}
> 340:           initialStatus={project.status}
  341:         />
  342: 
  343:         <CharacterConceptWorkspace
  344:           projectId={project.id}
  345:           initialConcepts={project.concepts}
```

### app\modules\character-forge\[projectId]\page.tsx line 345

```text
  340:           initialStatus={project.status}
  341:         />
  342: 
  343:         <CharacterConceptWorkspace
  344:           projectId={project.id}
> 345:           initialConcepts={project.concepts}
  346:           initialSelectedConceptId={project.selectedConceptId}
  347:           initialStatus={project.status}
  348:         />
  349: 
  350:         <CharacterIdentityAnchorWorkspace
```

### app\modules\character-forge\[projectId]\page.tsx line 346

```text
  341:         />
  342: 
  343:         <CharacterConceptWorkspace
  344:           projectId={project.id}
  345:           initialConcepts={project.concepts}
> 346:           initialSelectedConceptId={project.selectedConceptId}
  347:           initialStatus={project.status}
  348:         />
  349: 
  350:         <CharacterIdentityAnchorWorkspace
  351:           projectId={project.id}
```

### app\modules\character-forge\[projectId]\page.tsx line 347

```text
  342: 
  343:         <CharacterConceptWorkspace
  344:           projectId={project.id}
  345:           initialConcepts={project.concepts}
  346:           initialSelectedConceptId={project.selectedConceptId}
> 347:           initialStatus={project.status}
  348:         />
  349: 
  350:         <CharacterIdentityAnchorWorkspace
  351:           projectId={project.id}
  352:           initialStatus={project.status}
```

### app\modules\character-forge\[projectId]\page.tsx line 352

```text
  347:           initialStatus={project.status}
  348:         />
  349: 
  350:         <CharacterIdentityAnchorWorkspace
  351:           projectId={project.id}
> 352:           initialStatus={project.status}
  353:           selectedConcept={selectedConcept}
  354:           initialIdentityAnchor={project.identityAnchor ?? null}
  355:         />
  356: 
  357:         <CharacterCanonicalPoseWorkspace
```

### app\modules\character-forge\[projectId]\page.tsx line 354

```text
  349: 
  350:         <CharacterIdentityAnchorWorkspace
  351:           projectId={project.id}
  352:           initialStatus={project.status}
  353:           selectedConcept={selectedConcept}
> 354:           initialIdentityAnchor={project.identityAnchor ?? null}
  355:         />
  356: 
  357:         <CharacterCanonicalPoseWorkspace
  358:           projectId={project.id}
  359:           initialStatus={project.status}
```

### app\modules\character-forge\[projectId]\page.tsx line 359

```text
  354:           initialIdentityAnchor={project.identityAnchor ?? null}
  355:         />
  356: 
  357:         <CharacterCanonicalPoseWorkspace
  358:           projectId={project.id}
> 359:           initialStatus={project.status}
  360:           initialIdentityAnchor={project.identityAnchor ?? null}
  361:           initialCanonicalPose={project.canonicalPose ?? null}
  362:         />
  363: 
  364:         <CharacterModelWorkspace
```

### app\modules\character-forge\[projectId]\page.tsx line 360

```text
  355:         />
  356: 
  357:         <CharacterCanonicalPoseWorkspace
  358:           projectId={project.id}
  359:           initialStatus={project.status}
> 360:           initialIdentityAnchor={project.identityAnchor ?? null}
  361:           initialCanonicalPose={project.canonicalPose ?? null}
  362:         />
  363: 
  364:         <CharacterModelWorkspace
  365:           projectId={project.id}
```

### app\modules\character-forge\[projectId]\page.tsx line 361

```text
  356: 
  357:         <CharacterCanonicalPoseWorkspace
  358:           projectId={project.id}
  359:           initialStatus={project.status}
  360:           initialIdentityAnchor={project.identityAnchor ?? null}
> 361:           initialCanonicalPose={project.canonicalPose ?? null}
  362:         />
  363: 
  364:         <CharacterModelWorkspace
  365:           projectId={project.id}
  366:           projectName={project.name}
```

### app\modules\character-forge\[projectId]\page.tsx line 367

```text
  362:         />
  363: 
  364:         <CharacterModelWorkspace
  365:           projectId={project.id}
  366:           projectName={project.name}
> 367:           initialStatus={project.status}
  368:           initialCanonicalPose={project.canonicalPose ?? null}
  369:           initialModelAsset={project.modelAsset ?? null}
  370:         />
  371:       </main>
  372:     </ChernobogShell>
```

### app\modules\character-forge\[projectId]\page.tsx line 368

```text
  363: 
  364:         <CharacterModelWorkspace
  365:           projectId={project.id}
  366:           projectName={project.name}
  367:           initialStatus={project.status}
> 368:           initialCanonicalPose={project.canonicalPose ?? null}
  369:           initialModelAsset={project.modelAsset ?? null}
  370:         />
  371:       </main>
  372:     </ChernobogShell>
  373:   );
```

### app\modules\character-forge\[projectId]\page.tsx line 369

```text
  364:         <CharacterModelWorkspace
  365:           projectId={project.id}
  366:           projectName={project.name}
  367:           initialStatus={project.status}
  368:           initialCanonicalPose={project.canonicalPose ?? null}
> 369:           initialModelAsset={project.modelAsset ?? null}
  370:         />
  371:       </main>
  372:     </ChernobogShell>
  373:   );
  374: }
```


## Existing Phase 11F runtime publisher verifiers

Pattern: `runtime-publishers|system-publishers|project-observation|ollama-health|service-node-health|backup-storage|desktop-events`

### scripts\verify-chernobog-phase11-11g-a-world-state-foundation.ts line 74

```text
   71:       eventOccurredAt: "2026-08-24T20:59:55+00:00",
   72:       eventReceivedAt: "2026-08-24T20:59:56+00:00",
   73:       source: {
>  74:         subsystem: "ollama-health",
   75:         nodeId: "desktop",
   76:       },
   77:     },
```

### scripts\verify-chernobog-phase11-11g-b-state-projection-engine.ts line 27

```text
   24:     occurredAt: "2026-08-24T21:00:00.000Z",
   25:     receivedAt: "2026-08-24T21:00:01.000Z",
   26:     source: {
>  27:       subsystem: "ollama-health",
   28:       nodeId: "desktop",
   29:     },
   30:     severity: "info",
```

### scripts\verify-chernobog-phase11-11g-b-state-projection-engine.ts line 57

```text
   54:   assert.equal(derived.expiresAt, "2026-08-24T21:05:00.000Z");
   55:   assert.equal(derived.provenance?.eventId, "evt-001");
   56:   assert.equal(derived.provenance?.eventType, "runtime.ollama.health_changed");
>  57:   assert.equal(derived.provenance?.source?.subsystem, "ollama-health");
   58:   pass("event metadata becomes canonical world-state provenance");
   59: 
   60:   const projectorRegistry = new ChernobogWorldStateProjectorRegistry();
```

### scripts\verify-chernobog-phase11-11g-b-state-projection-engine.ts line 63

```text
   60:   const projectorRegistry = new ChernobogWorldStateProjectorRegistry();
   61: 
   62:   const detachExact = projectorRegistry.register({
>  63:     id: "ollama-health",
   64:     eventTypes: ["runtime.ollama.health_changed"],
   65:     project(input) {
   66:       const payload = input.payload as { health: string };
```

### scripts\verify-chernobog-phase11-11g-b-state-projection-engine.ts line 85

```text
   82:   assert.equal(projectorRegistry.size, 2);
   83:   assert.deepEqual(
   84:     projectorRegistry.matching(event()).map((item) => item.id),
>  85:     ["ollama-health", "runtime-catchall"],
   86:   );
   87:   pass("projector registry matches exact types and prefixes deterministically");
   88: 
```

### scripts\verify-chernobog-phase11-11g-b-state-projection-engine.ts line 91

```text
   88: 
   89:   assert.throws(() =>
   90:     projectorRegistry.register({
>  91:       id: "ollama-health",
   92:       project() {
   93:         return undefined;
   94:       },
```

### scripts\verify-chernobog-phase11-11g-c-evidence-semantics.ts line 28

```text
   25:     occurredAt: "2026-08-24T21:00:00.000Z",
   26:     receivedAt: "2026-08-24T21:00:01.000Z",
   27:     source: {
>  28:       subsystem: "ollama-health",
   29:       nodeId: "desktop",
   30:     },
   31:     severity: "info",
```

### scripts\verify-chernobog-phase11-11g-c-evidence-semantics.ts line 94

```text
   91:         key: "service.ollama.health",
   92:         value: "healthy",
   93:       },
>  94:       "ollama-health-projector",
   95:     );
   96: 
   97:   assert.equal(
```

### scripts\verify-chernobog-phase11-11g-c-evidence-semantics.ts line 111

```text
  108:   );
  109:   assert.equal(
  110:     eventDerived.provenance?.projectorId,
> 111:     "ollama-health-projector",
  112:   );
  113:   assert.equal(
  114:     eventDerived.provenance?.correlationId,
```

### scripts\verify-chernobog-phase11-11g-c-evidence-semantics.ts line 142

```text
  139:         confidence: 0.98,
  140:         ttlMs: 30_000,
  141:       },
> 142:       "ollama-health-projector",
  143:     );
  144: 
  145:   assert.equal(
```

### scripts\verify-chernobog-phase11-11g-c-evidence-semantics.ts line 180

```text
  177:         key: "service.ollama.health",
  178:         value: "healthy",
  179:       },
> 180:       "ollama-health-projector",
  181:     );
  182: 
  183:   assert.equal(
```

### scripts\verify-chernobog-phase11-11g-c-evidence-semantics.ts line 281

```text
  278:   );
  279:   assert.equal(
  280:     assessment.projectorId,
> 281:     "ollama-health-projector",
  282:   );
  283:   assert.equal(
  284:     assessment.sourceSubsystem,
```

### scripts\verify-chernobog-phase11-11g-c-evidence-semantics.ts line 285

```text
  282:   );
  283:   assert.equal(
  284:     assessment.sourceSubsystem,
> 285:     "ollama-health",
  286:   );
  287:   pass(
  288:     "evidence assessment reports age, confidence, freshness, and lineage without cognitive interpretation",
```

### scripts\verify-chernobog-phase11-11g-d-persistence-recovery.ts line 39

```text
   36:     occurredAt: "2026-08-24T21:00:00.000Z",
   37:     receivedAt: "2026-08-24T21:00:01.000Z",
   38:     source: {
>  39:       subsystem: "ollama-health",
   40:       nodeId: "desktop",
   41:     },
   42:     severity: "info",
```

### scripts\verify-chernobog-phase11-11g-d-persistence-recovery.ts line 58

```text
   55:   engine: ChernobogWorldStateProjectionEngine,
   56: ): void {
   57:   engine.register({
>  58:     id: "ollama-health-projector",
   59:     eventTypes: [
   60:       "runtime.ollama.health_changed",
   61:     ],
```

### scripts\verify-chernobog-phase11-11g-d-persistence-recovery.ts line 188

```text
  185:         eventReceivedAt:
  186:           "2026-08-24T21:00:01.000Z",
  187:         projectorId:
> 188:           "ollama-health-projector",
  189:         source: {
  190:           subsystem: "ollama-health",
  191:         },
```

### scripts\verify-chernobog-phase11-11g-d-persistence-recovery.ts line 190

```text
  187:         projectorId:
  188:           "ollama-health-projector",
  189:         source: {
> 190:           subsystem: "ollama-health",
  191:         },
  192:       },
  193:     });
```

### scripts\verify-chernobog-phase11-11g-e-state-query-layer.ts line 59

```text
   56:       eventReceivedAt:
   57:         "2026-08-24T22:29:51.000Z",
   58:       projectorId:
>  59:         "ollama-health-projector",
   60:       source: {
   61:         subsystem: "ollama-health",
   62:       },
```

### scripts\verify-chernobog-phase11-11g-e-state-query-layer.ts line 61

```text
   58:       projectorId:
   59:         "ollama-health-projector",
   60:       source: {
>  61:         subsystem: "ollama-health",
   62:       },
   63:     },
   64:   });
```

### scripts\verify-chernobog-phase11-11g-e-state-query-layer.ts line 167

```text
  164:     explanation.evidence.some(
  165:       (line) =>
  166:         line.includes(
> 167:           "ollama-health-projector",
  168:         ),
  169:     ),
  170:   );
```

### scripts\verify-chernobog-phase11-11g-f-full-integration.ts line 371

```text
  368:         "2026-08-24T22:30:10.000Z",
  369:         {
  370:           subsystem:
> 371:             "backup-storage",
  372:           subject:
  373:             "primary",
  374:           payload: {
```

### scripts\verify-chernobog-phase11-11g-f-full-integration.ts line 386

```text
  383:         "2026-08-24T22:30:11.000Z",
  384:         {
  385:           subsystem:
> 386:             "backup-storage",
  387:           subject:
  388:             "vault",
  389:           payload: {
```

### scripts\verify-chernobog-phase11-11h-f-full-integration.ts line 190

```text
  187: const readOpportunity:
  188:   CognitiveActionOpportunity = {
  189:     id:
> 190:       "inspect-ollama-health",
  191:     description:
  192:       "Inspect Ollama health",
  193:     capability:
```

### scripts\verify-chernobog-phase11-11h-f-full-integration.ts line 254

```text
  251: assert.equal(
  252:   actionable.action.opportunity
  253:     ?.id,
> 254:   "inspect-ollama-health",
  255: );
  256: pass(
  257:   "explicit bounded governance can authorize a low-risk reversible action intent",
```


## Interpretation guide

- Recent Event Spine events + stale World State only => projection/runtime subscription problem.
- Event Spine itself has no fresh runtime/service/model/project observations => live publisher startup problem.
- Publisher functions exist but no live app startup reference => wire the existing publishers into one canonical runtime bootstrap.
- Fresh events and fresh snapshot records both exist => conversational filtering/scoping is the remaining problem.
