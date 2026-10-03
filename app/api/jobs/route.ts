import {
  FileJobStore,
  getDefaultJobStorePath,
} from "@chernobog/core";
import {
  JobControlRuntime,
  type CreateScheduleInput,
  type RescheduleInput,
  type RunNowInput,
} from "@chernobog/runtime";

import { createJobEventSpineObserver } from "@/lib/chernobog/jobs/jobEventSpine";

type JsonRecord = Record<string, unknown>;

function json(
  body: unknown,
  status = 200,
): Response {
  return Response.json(body, { status });
}

function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("request body must be a JSON object");
  }
  return value as JsonRecord;
}

function requiredString(
  record: JsonRecord,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

function createControlRuntime(): JobControlRuntime {
  const store = new FileJobStore(
    getDefaultJobStorePath(),
    createJobEventSpineObserver(),
  );

  return new JobControlRuntime(store);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") ?? "snapshot";
    const control = createControlRuntime();

    switch (view) {
      case "schedules":
        return json({
          schedules: control.listSchedules(),
        });

      case "queued":
        return json({
          runs: control.listQueued(),
        });

      case "failures":
        return json({
          runs: control.showFailures(),
        });

      case "next-runs":
        return json({
          nextRuns: control.showNextRuns(
            url.searchParams.get("ownerId") ?? undefined,
          ),
        });

      case "job": {
        const jobId = url.searchParams.get("jobId");
        if (!jobId) {
          return json(
            { error: "jobId query parameter is required" },
            400,
          );
        }

        const state = control.showJob(jobId);
        if (!state.job) {
          return json(
            { error: `Unknown job: ${jobId}` },
            404,
          );
        }

        return json(state);
      }

      case "snapshot":
        return json(control.snapshot());

      default:
        return json(
          { error: `Unknown jobs view: ${view}` },
          400,
        );
    }
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500,
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = asRecord(await request.json());
    const action = requiredString(body, "action");
    const control = createControlRuntime();

    switch (action) {
      case "schedule": {
        const input: CreateScheduleInput = {
          id: requiredString(body, "scheduleId"),
          jobId: requiredString(body, "jobId"),
          trigger: body.trigger as CreateScheduleInput["trigger"],
          ...(body.missedRunPolicy !== undefined
            ? {
                missedRunPolicy:
                  body.missedRunPolicy as CreateScheduleInput["missedRunPolicy"],
              }
            : {}),
        };

        return json(
          { schedule: control.schedule(input) },
          201,
        );
      }

      case "reschedule": {
        const input: RescheduleInput = {
          scheduleId: requiredString(body, "scheduleId"),
          trigger: body.trigger as RescheduleInput["trigger"],
          ...(body.missedRunPolicy !== undefined
            ? {
                missedRunPolicy:
                  body.missedRunPolicy as RescheduleInput["missedRunPolicy"],
              }
            : {}),
        };

        return json({
          schedule: control.reschedule(input),
        });
      }

      case "pause":
        return json({
          schedule: control.pause(
            requiredString(body, "scheduleId"),
          ),
        });

      case "resume":
        return json({
          schedule: control.resume(
            requiredString(body, "scheduleId"),
          ),
        });

      case "cancel":
        return json({
          schedule: control.cancel(
            requiredString(body, "scheduleId"),
          ),
        });

      case "run-now": {
        const input: RunNowInput = {
          jobId: requiredString(body, "jobId"),
          ...(Object.prototype.hasOwnProperty.call(body, "payload")
            ? { payload: body.payload }
            : {}),
        };

        return json(
          { run: control.runNow(input) },
          201,
        );
      }

      default:
        return json(
          { error: `Unknown jobs action: ${action}` },
          400,
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    const status =
      message.startsWith("Unknown job:") ||
      message.startsWith("Unknown schedule:")
        ? 404
        : 400;

    return json({ error: message }, status);
  }
}
