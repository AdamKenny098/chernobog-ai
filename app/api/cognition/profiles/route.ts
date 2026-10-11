import {
  NextResponse,
} from "next/server";

import {
  getCognitiveProfile,
  listCognitiveProfiles,
  resolveCognitiveProfile,
  type CognitiveProfileName,
  type CognitiveProfileTaskConstraints,
} from "@chernobog/models/cognitiveProfiles";

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

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const name =
      url.searchParams
        .get(
          "name",
        )
        ?.trim()
        .toLowerCase() as
        | CognitiveProfileName
        | undefined;

    if (!name) {
      return NextResponse.json({
        ok:
          true,

        profiles:
          listCognitiveProfiles(),
      });
    }

    return NextResponse.json({
      ok:
        true,

      profile:
        getCognitiveProfile(
          name,
        ),
    });
  } catch (error) {
    return failure(
      error,
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json() as {
        profile?:
          CognitiveProfileName;

        task?:
          CognitiveProfileTaskConstraints;
      };

    if (
      !body.profile
    ) {
      throw new Error(
        "profile is required. Valid profiles: fast, deep, private, cheap, experimental.",
      );
    }

    const resolved =
      resolveCognitiveProfile(
        body.profile,
        body.task ??
        {},
      );

    return NextResponse.json({
      ok:
        true,

      resolved,
    });
  } catch (error) {
    return failure(
      error,
    );
  }
}