import type {
  GoogleCalendarEvent,
  GoogleCalendarMutationPlan,
} from "./types";
import {
  decryptGoogleCalendarSecret,
  encryptGoogleCalendarSecret,
  readGoogleCalendarState,
  updateGoogleCalendarState,
} from "./store";

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";

const GOOGLE_TOKEN_ENDPOINT =
  "https://oauth2.googleapis.com/token";

const GOOGLE_CALENDAR_API =
  "https://www.googleapis.com/calendar/v3";

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

function clientId():
  string {
  const value =
    process.env
      .CHERNOBOG_PA5_GOOGLE_CLIENT_ID
      ?.trim();

  if (!value) {
    throw new Error(
      "CHERNOBOG_PA5_GOOGLE_CLIENT_ID is not configured.",
    );
  }

  return value;
}

function clientSecret():
  string {
  const value =
    process.env
      .CHERNOBOG_PA5_GOOGLE_CLIENT_SECRET
      ?.trim();

  if (!value) {
    throw new Error(
      "CHERNOBOG_PA5_GOOGLE_CLIENT_SECRET is not configured.",
    );
  }

  return value;
}

export function googleCalendarClientConfigured():
  boolean {
  return Boolean(
    process.env
      .CHERNOBOG_PA5_GOOGLE_CLIENT_ID
      ?.trim() &&
    process.env
      .CHERNOBOG_PA5_GOOGLE_CLIENT_SECRET
      ?.trim() &&
    process.env
      .CHERNOBOG_PA5_TOKEN_KEY
      ?.trim(),
  );
}

export function googleCalendarRedirectUri(
  origin:
    string,
): string {
  return (
    process.env
      .CHERNOBOG_PA5_GOOGLE_REDIRECT_URI
      ?.trim() ||
    `${origin.replace(
      /\/$/u,
      "",
    )}/api/personal-assistance/calendar/google/callback`
  );
}

export function googleCalendarAuthorizationUrl(
  input: {
    state: string;
    redirectUri: string;
  },
): string {
  const url =
    new URL(
      GOOGLE_AUTHORIZATION_ENDPOINT,
    );

  url.searchParams.set(
    "client_id",
    clientId(),
  );

  url.searchParams.set(
    "redirect_uri",
    input.redirectUri,
  );

  url.searchParams.set(
    "response_type",
    "code",
  );

  url.searchParams.set(
    "scope",
    GOOGLE_CALENDAR_SCOPE,
  );

  url.searchParams.set(
    "access_type",
    "offline",
  );

  url.searchParams.set(
    "prompt",
    "consent",
  );

  url.searchParams.set(
    "include_granted_scopes",
    "true",
  );

  url.searchParams.set(
    "state",
    input.state,
  );

  return url.toString();
}

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
};

async function tokenRequest(
  body:
    URLSearchParams,
): Promise<GoogleTokenResponse> {
  const response =
    await fetch(
      GOOGLE_TOKEN_ENDPOINT,
      {
        method:
          "POST",
        headers: {
          "content-type":
            "application/x-www-form-urlencoded",
        },
        body:
          body.toString(),
      },
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Google OAuth token request failed with status ${response.status}.`,
    );
  }

  const payload =
    (await response.json()) as
      Partial<GoogleTokenResponse>;

  if (
    !payload.access_token
  ) {
    throw new Error(
      "Google OAuth token response did not include an access token.",
    );
  }

  return payload as
    GoogleTokenResponse;
}

export async function exchangeGoogleCalendarAuthorizationCode(
  input: {
    code: string;
    redirectUri: string;
  },
): Promise<void> {
  const token =
    await tokenRequest(
      new URLSearchParams({
        code:
          input.code,
        client_id:
          clientId(),
        client_secret:
          clientSecret(),
        redirect_uri:
          input.redirectUri,
        grant_type:
          "authorization_code",
      }),
    );

  await updateGoogleCalendarState(
    (
      current,
    ) => ({
      ...current,
      auth: {
        accessToken:
          encryptGoogleCalendarSecret(
            token.access_token,
          ),
        refreshToken:
          token.refresh_token
            ? encryptGoogleCalendarSecret(
                token.refresh_token,
              )
            : current.auth
                .refreshToken,
        accessTokenExpiresAt:
          token.expires_in
            ? new Date(
                Date.now() +
                token.expires_in *
                  1000,
              ).toISOString()
            : null,
        scope:
          token.scope ??
          GOOGLE_CALENDAR_SCOPE,
        connectedAt:
          current.auth
            .connectedAt ??
          new Date()
            .toISOString(),
      },
      oauthPending:
        null,
    }),
  );
}

async function refreshAccessToken():
  Promise<string> {
  const state =
    await readGoogleCalendarState();

  const encryptedRefresh =
    state.auth
      .refreshToken;

  if (
    !encryptedRefresh
  ) {
    throw new Error(
      "Google Calendar authorization has no refresh token. Reconnect Google Calendar.",
    );
  }

  const refreshToken =
    decryptGoogleCalendarSecret(
      encryptedRefresh,
    );

  const token =
    await tokenRequest(
      new URLSearchParams({
        client_id:
          clientId(),
        client_secret:
          clientSecret(),
        refresh_token:
          refreshToken,
        grant_type:
          "refresh_token",
      }),
    );

  await updateGoogleCalendarState(
    (
      current,
    ) => ({
      ...current,
      auth: {
        ...current.auth,
        accessToken:
          encryptGoogleCalendarSecret(
            token.access_token,
          ),
        accessTokenExpiresAt:
          token.expires_in
            ? new Date(
                Date.now() +
                token.expires_in *
                  1000,
              ).toISOString()
            : null,
        scope:
          token.scope ??
          current.auth
            .scope,
      },
    }),
  );

  return token.access_token;
}

async function accessToken():
  Promise<string> {
  const state =
    await readGoogleCalendarState();

  if (
    state.auth
      .accessToken &&
    state.auth
      .accessTokenExpiresAt &&
    Date.parse(
      state.auth
        .accessTokenExpiresAt,
    ) >
      Date.now() +
      60_000
  ) {
    return decryptGoogleCalendarSecret(
      state.auth
        .accessToken,
    );
  }

  return refreshAccessToken();
}

async function calendarRequest<T>(
  url:
    string,
  options:
    RequestInit = {},
  allowRefresh =
    true,
): Promise<T> {
  const token =
    await accessToken();

  const response =
    await fetch(
      url,
      {
        ...options,
        headers: {
          authorization:
            `Bearer ${token}`,
          "content-type":
            "application/json",
          ...(options.headers ??
            {}),
        },
      },
    );

  if (
    response.status ===
      401 &&
    allowRefresh
  ) {
    await refreshAccessToken();

    return calendarRequest<T>(
      url,
      options,
      false,
    );
  }

  if (
    !response.ok
  ) {
    throw new Error(
      `Google Calendar API request failed with status ${response.status}.`,
    );
  }

  if (
    response.status ===
      204
  ) {
    return undefined as T;
  }

  return (
    await response.json()
  ) as T;
}

type EventListResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
};

async function listEvents(
  calendarId:
    string,
  parameters:
    URLSearchParams,
): Promise<GoogleCalendarEvent[]> {
  const events:
    GoogleCalendarEvent[] =
    [];

  let pageToken:
    string |
    undefined;

  do {
    const params =
      new URLSearchParams(
        parameters,
      );

    if (
      pageToken
    ) {
      params.set(
        "pageToken",
        pageToken,
      );
    }

    const url =
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId,
      )}/events?${params.toString()}`;

    const response =
      await calendarRequest<EventListResponse>(
        url,
      );

    events.push(
      ...(
        response.items ??
        []
      ),
    );

    pageToken =
      response.nextPageToken;
  } while (
    pageToken
  );

  return events;
}

export async function listChernobogManagedGoogleEvents(
  calendarId:
    string,
): Promise<GoogleCalendarEvent[]> {
  const params =
    new URLSearchParams();

  params.set(
    "maxResults",
    "2500",
  );

  params.set(
    "singleEvents",
    "true",
  );

  params.append(
    "privateExtendedProperty",
    "chernobogManaged=pa5-work-shift",
  );

  return listEvents(
    calendarId,
    params,
  );
}

export async function listGoogleEventsInWindow(
  calendarId:
    string,
  timeMin:
    string,
  timeMax:
    string,
): Promise<GoogleCalendarEvent[]> {
  const params =
    new URLSearchParams({
      maxResults:
        "2500",
      singleEvents:
        "true",
      timeMin,
      timeMax,
    });

  return listEvents(
    calendarId,
    params,
  );
}

export async function applyGoogleCalendarMutationPlan(
  calendarId:
    string,
  plan:
    GoogleCalendarMutationPlan,
): Promise<{
  created: number;
  updated: number;
  deleted: number;
}> {
  let created =
    0;

  let updated =
    0;

  let deleted =
    0;

  for (
    const item of
    plan.create
  ) {
    await calendarRequest(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId,
      )}/events`,
      {
        method:
          "POST",
        body:
          JSON.stringify(
            item.body,
          ),
      },
    );

    created +=
      1;
  }

  for (
    const item of
    plan.update
  ) {
    await calendarRequest(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
        calendarId,
      )}/events/${encodeURIComponent(
        item.eventId,
      )}`,
      {
        method:
          "PATCH",
        body:
          JSON.stringify(
            item.desired
              .body,
          ),
      },
    );

    updated +=
      1;
  }

  for (
    const eventId of
    plan.delete
  ) {
    try {
      await calendarRequest(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(
          calendarId,
        )}/events/${encodeURIComponent(
          eventId,
        )}`,
        {
          method:
            "DELETE",
        },
      );

      deleted +=
        1;
    } catch (
      error
    ) {
      if (
        error instanceof Error &&
        /status 404|status 410/u.test(
          error.message,
        )
      ) {
        continue;
      }

      throw error;
    }
  }

  return {
    created,
    updated,
    deleted,
  };
}