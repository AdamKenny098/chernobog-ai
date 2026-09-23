import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type {
  GoogleCalendarState,
} from "./types";

const DEFAULT_STATE:
  GoogleCalendarState = {
  schemaVersion:
    1,
  config: {
    calendarId:
      "primary",
    autoSyncWorkSchedule:
      true,
    eventTitle:
      "Work",
  },
  auth: {
    accessToken:
      null,
    refreshToken:
      null,
    accessTokenExpiresAt:
      null,
    scope:
      null,
    connectedAt:
      null,
  },
  oauthPending:
    null,
  lastSync:
    null,
};

let writeChain =
  Promise.resolve();

function statePath():
  string {
  return (
    process.env
      .CHERNOBOG_PA5_STATE_FILE ??
    path.join(
      process.cwd(),
      "data",
      "personal-assistance",
      "google-calendar.json",
    )
  );
}

function clone<T>(
  value: T,
): T {
  return JSON.parse(
    JSON.stringify(
      value,
    ),
  ) as T;
}

function normalizedState(
  value:
    Partial<GoogleCalendarState> |
    null |
    undefined,
): GoogleCalendarState {
  return {
    schemaVersion:
      1,
    config: {
      ...DEFAULT_STATE.config,
      ...value?.config,
    },
    auth: {
      ...DEFAULT_STATE.auth,
      ...value?.auth,
    },
    oauthPending:
      value?.oauthPending ??
      null,
    lastSync:
      value?.lastSync ??
      null,
  };
}

export async function readGoogleCalendarState():
  Promise<GoogleCalendarState> {
  try {
    const raw =
      await readFile(
        statePath(),
        "utf8",
      );

    return normalizedState(
      JSON.parse(
        raw,
      ) as
        Partial<GoogleCalendarState>,
    );
  } catch (
    error
  ) {
    if (
      error instanceof Error &&
      "code" in error &&
      (
        error as
          NodeJS.ErrnoException
      ).code ===
        "ENOENT"
    ) {
      return clone(
        DEFAULT_STATE,
      );
    }

    throw error;
  }
}

async function writeStateNow(
  state:
    GoogleCalendarState,
): Promise<void> {
  const target =
    statePath();

  await mkdir(
    path.dirname(
      target,
    ),
    {
      recursive:
        true,
    },
  );

  const temporary =
    `${target}.${process.pid}.tmp`;

  await writeFile(
    temporary,
    JSON.stringify(
      state,
      null,
      2,
    ),
    {
      encoding:
        "utf8",
      mode:
        0o600,
    },
  );

  await rename(
    temporary,
    target,
  );
}

export async function writeGoogleCalendarState(
  state:
    GoogleCalendarState,
): Promise<void> {
  const next =
    clone(
      state,
    );

  writeChain =
    writeChain.then(
      () =>
        writeStateNow(
          next,
        ),
    );

  await writeChain;
}

export async function updateGoogleCalendarState(
  update:
    (
      current:
        GoogleCalendarState,
    ) =>
      GoogleCalendarState |
      Promise<GoogleCalendarState>,
): Promise<GoogleCalendarState> {
  let result:
    GoogleCalendarState =
    clone(
      DEFAULT_STATE,
    );

  writeChain =
    writeChain.then(
      async () => {
        const current =
          await readGoogleCalendarState();

        result =
          normalizedState(
            await update(
              clone(
                current,
              ),
            ),
          );

        await writeStateNow(
          result,
        );
      },
    );

  await writeChain;

  return clone(
    result,
  );
}

function tokenKey():
  Buffer {
  const configured =
    process.env
      .CHERNOBOG_PA5_TOKEN_KEY
      ?.trim();

  if (!configured) {
    throw new Error(
      "CHERNOBOG_PA5_TOKEN_KEY is not configured.",
    );
  }

  const key =
    Buffer.from(
      configured,
      "base64",
    );

  if (
    key.length !==
    32
  ) {
    throw new Error(
      "CHERNOBOG_PA5_TOKEN_KEY must decode to exactly 32 bytes.",
    );
  }

  return key;
}

export function encryptGoogleCalendarSecret(
  plaintext:
    string,
): string {
  const iv =
    randomBytes(
      12,
    );

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      tokenKey(),
      iv,
    );

  const ciphertext =
    Buffer.concat([
      cipher.update(
        plaintext,
        "utf8",
      ),
      cipher.final(),
    ]);

  const tag =
    cipher.getAuthTag();

  return [
    iv.toString(
      "base64",
    ),
    tag.toString(
      "base64",
    ),
    ciphertext.toString(
      "base64",
    ),
  ].join(
    ".",
  );
}

export function decryptGoogleCalendarSecret(
  payload:
    string,
): string {
  const parts =
    payload.split(
      ".",
    );

  if (
    parts.length !==
    3
  ) {
    throw new Error(
      "Stored Google Calendar credential is malformed.",
    );
  }

  const [
    ivText,
    tagText,
    ciphertextText,
  ] = parts;

  const decipher =
    createDecipheriv(
      "aes-256-gcm",
      tokenKey(),
      Buffer.from(
        ivText,
        "base64",
      ),
    );

  decipher.setAuthTag(
    Buffer.from(
      tagText,
      "base64",
    ),
  );

  return Buffer.concat([
    decipher.update(
      Buffer.from(
        ciphertextText,
        "base64",
      ),
    ),
    decipher.final(),
  ]).toString(
    "utf8",
  );
}

export async function clearGoogleCalendarAuthorization():
  Promise<GoogleCalendarState> {
  return updateGoogleCalendarState(
    (
      current,
    ) => ({
      ...current,
      auth: {
        accessToken:
          null,
        refreshToken:
          null,
        accessTokenExpiresAt:
          null,
        scope:
          null,
        connectedAt:
          null,
      },
      oauthPending:
        null,
    }),
  );
}