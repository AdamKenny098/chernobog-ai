import type {
  JobStoreMutation,
  JobStoreMutationObserver,
} from "@chernobog/core";
import { publishChernobogEventSafely } from "@chernobog/events/publishers";

type JobEventType =
  | "job.scheduled"
  | "job.queued"
  | "job.claimed"
  | "job.started"
  | "job.completed"
  | "job.failed"
  | "job.retry_scheduled"
  | "job.cancelled"
  | "job.paused"
  | "job.resumed"
  | "job.recovered";

const pendingPublications = new Set<Promise<unknown>>();

function queuePublication(
  event: Parameters<typeof publishChernobogEventSafely>[0],
): void {
  const publication = publishChernobogEventSafely(event);
  pendingPublications.add(publication);

  void publication.finally(() => {
    pendingPublications.delete(publication);
  });
}

export async function flushJobEventSpine(): Promise<void> {
  while (pendingPublications.size > 0) {
    await Promise.all([...pendingPublications]);
  }
}

function severityFor(type: JobEventType): "info" | "notice" | "warning" {
  if (type === "job.failed") return "warning";
  if (
    type === "job.paused" ||
    type === "job.cancelled" ||
    type === "job.retry_scheduled" ||
    type === "job.recovered"
  ) {
    return "notice";
  }
  return "info";
}

function publish(
  type: JobEventType,
  subject: string,
  payload: Record<string, unknown>,
  correlationId?: string,
): void {
  queuePublication({
    type,
    source: {
      subsystem: "jobs",
      nodeId: "oh3",
    },
    severity: severityFor(type),
    subject,
    scope: "jobs",
    ...(correlationId ? { correlationId } : {}),
    payload,
  });
}

function publishScheduleMutation(
  mutation: Extract<JobStoreMutation, { entity: "schedule" }>,
): void {
  const before = mutation.before;
  const after = mutation.after;

  if (!after) return;

  const payload = {
    scheduleId: after.id,
    jobId: after.jobId,
    ownerId: after.owner.ownerId,
    status: after.status,
    trigger: after.trigger,
    lastReconciledAt: after.lastReconciledAt,
  };

  if (!before) {
    publish("job.scheduled", after.id, payload, after.jobId);
    return;
  }

  if (before.status !== after.status) {
    if (after.status === "paused") {
      publish("job.paused", after.id, payload, after.jobId);
    } else if (after.status === "cancelled") {
      publish("job.cancelled", after.id, payload, after.jobId);
    } else if (
      before.status === "paused" &&
      after.status === "active"
    ) {
      publish("job.resumed", after.id, payload, after.jobId);
    }
  }

  if (JSON.stringify(before.trigger) !== JSON.stringify(after.trigger)) {
    publish("job.scheduled", after.id, payload, after.jobId);
  }
}

function publishRunMutation(
  mutation: Extract<JobStoreMutation, { entity: "run" }>,
): void {
  const before = mutation.before;
  const after = mutation.after;

  if (!after) return;

  const payload = {
    runId: after.id,
    jobId: after.jobId,
    scheduleId: after.scheduleId,
    ownerId: after.owner.ownerId,
    status: after.status,
    attempt: after.attempt,
    workerId: after.workerId,
    scheduledFor: after.scheduledFor,
    queuedAt: after.queuedAt,
    claimedAt: after.claimedAt,
    startedAt: after.startedAt,
    finishedAt: after.finishedAt,
    leaseExpiresAt: after.leaseExpiresAt,
    error: after.error,
  };

  if (!before) {
    if (after.status === "queued") {
      publish("job.queued", after.id, payload, after.id);
    } else if (after.status === "scheduled") {
      publish("job.retry_scheduled", after.id, payload, after.id);
    }
    return;
  }

  if (before.status === after.status) return;

  if (after.status === "claimed") {
    publish("job.claimed", after.id, payload, after.id);
    return;
  }

  if (after.status === "running") {
    publish("job.started", after.id, payload, after.id);
    return;
  }

  if (after.status === "succeeded") {
    publish("job.completed", after.id, payload, after.id);
    return;
  }

  if (after.status === "failed") {
    if (after.error?.code === "worker_interrupted") {
      publish("job.recovered", after.id, payload, after.id);
    }
    publish("job.failed", after.id, payload, after.id);
    return;
  }

  if (after.status === "scheduled") {
    if (after.error?.code === "worker_interrupted") {
      publish("job.recovered", after.id, payload, after.id);
    }
    publish("job.retry_scheduled", after.id, payload, after.id);
    return;
  }

  if (
    after.status === "queued" &&
    (before.status === "claimed" || before.status === "running")
  ) {
    publish("job.recovered", after.id, payload, after.id);
    return;
  }

  if (after.status === "cancelled") {
    publish("job.cancelled", after.id, payload, after.id);
  }
}

export function createJobEventSpineObserver(): JobStoreMutationObserver {
  return (mutation) => {
    if (mutation.entity === "schedule") {
      publishScheduleMutation(mutation);
      return;
    }

    if (mutation.entity === "run") {
      publishRunMutation(mutation);
    }
  };
}
