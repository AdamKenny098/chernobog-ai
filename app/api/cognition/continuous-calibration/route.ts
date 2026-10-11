import {
  NextResponse,
} from "next/server";

import {
  getContinuousCalibrationEngine,
  type CalibrationObservation,
  type CalibrationSubject,
} from "@chernobog/models/continuousCalibration";

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
        action?:
          "ingest"
          | "snapshot"
          | "save";

        observation?:
          CalibrationObservation;

        observations?:
          CalibrationObservation[];

        subjects?:
          CalibrationSubject[];
      };

    const engine =
      await getContinuousCalibrationEngine();

    switch (
      body.action
    ) {
      case "ingest": {
        const observations =
          body.observations ??
          (
            body.observation
              ? [
                  body.observation,
                ]
              : []
          );

        if (
          observations.length ===
          0
        ) {
          throw new Error(
            "observation or observations are required for calibration ingest.",
          );
        }

        const ingested =
          engine.ingestMany(
            observations,
          );

        await engine.save();

        return NextResponse.json({
          ok:
            true,

          ingested,
        });
      }

      case "snapshot": {
        if (
          !body.subjects
        ) {
          throw new Error(
            "subjects are required for a continuous calibration snapshot.",
          );
        }

        return NextResponse.json({
          ok:
            true,

          snapshot:
            engine.snapshot(
              body.subjects,
            ),
        });
      }

      case "save": {
        await engine.save();

        return NextResponse.json({
          ok:
            true,

          saved:
            true,
        });
      }

      default:
        throw new Error(
          "action must be ingest, snapshot, or save.",
        );
    }
  } catch (error) {
    return failure(
      error,
    );
  }
}