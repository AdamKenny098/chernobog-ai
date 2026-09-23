import {
  NextResponse,
} from "next/server";

import {
  createPersonalAssistanceMobileEnrollment,
  publishMobileEnrollmentCreated,
} from "@/lib/chernobog/personalAssistance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readExpiresInMinutes(
  value: unknown,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    throw new Error(
      "expiresInMinutes must be an integer.",
    );
  }

  return value;
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request
        .json()
        .catch(
          () => ({}),
        );

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      throw new Error(
        "Request body must be a JSON object.",
      );
    }

    const challenge =
      createPersonalAssistanceMobileEnrollment({
        expiresInMinutes:
          readExpiresInMinutes(
            (
              body as
                Record<string, unknown>
            ).expiresInMinutes,
          ),
      });

    await publishMobileEnrollmentCreated(
      challenge,
    );

    return NextResponse.json({
      ok: true,
      enrollment:
        challenge,
      boundary: {
        executesTools: false,
        grantsPermissions: false,
        notificationIngestEnabled: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "mobile_enrollment_create_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 400,
      },
    );
  }
}