"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type CalendarStatus = {
  clientConfigured: boolean;
  connected: boolean;
  redirectUri: string;
  calendarId: string;
  autoSyncWorkSchedule: boolean;
  eventTitle: string;
  lastSync: {
    disposition: string;
    snapshotId: string | null;
    created: number;
    updated: number;
    deleted: number;
    unchanged: number;
    conflictCount: number;
    completedAt: string | null;
    error: string | null;
  } | null;
};

export default function CalendarStewardSurface() {
  const [
    status,
    setStatus,
  ] =
    useState<
      CalendarStatus |
      null
    >(
      null,
    );

  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    );

  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(
      null,
    );

  const refresh =
    useCallback(
      async () => {
        const response =
          await fetch(
            "/api/personal-assistance/calendar/google",
            {
              cache:
                "no-store",
            },
          );

        const payload =
          await response.json();

        if (
          !response.ok ||
          !payload.ok
        ) {
          throw new Error(
            payload.message ??
            "Unable to read Google Calendar status.",
          );
        }

        setStatus(
          payload.status,
        );
      },
      [],
    );

    useEffect(
      () => {
        const refreshTimer =
          window.setTimeout(
            () => {
              void refresh()
                .catch(
                  (
                    issue,
                  ) => {
                    setError(
                      issue instanceof Error
                        ? issue.message
                        : String(
                            issue,
                          ),
                    );
                  },
                );
            },
            0,
          );

        return () => {
          window.clearTimeout(
            refreshTimer,
          );
        };
      },
      [
        refresh,
      ],
    );

  async function syncNow() {
    setBusy(
      true,
    );

    setError(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/personal-assistance/calendar/google",
          {
            method:
              "POST",
          },
        );

      const payload =
        await response.json();

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.message ??
          payload.sync
            ?.error ??
          "Google Calendar sync failed.",
        );
      }

      setStatus(
        payload.status,
      );
    } catch (
      issue
    ) {
      setError(
        issue instanceof Error
          ? issue.message
          : String(
              issue,
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  async function toggleAutoSync() {
    if (
      !status
    ) {
      return;
    }

    setBusy(
      true,
    );

    setError(
      null,
    );

    try {
      const response =
        await fetch(
          "/api/personal-assistance/calendar/google",
          {
            method:
              "PATCH",
            headers: {
              "content-type":
                "application/json",
            },
            body:
              JSON.stringify({
                autoSyncWorkSchedule:
                  !status
                    .autoSyncWorkSchedule,
              }),
          },
        );

      const payload =
        await response.json();

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.message ??
          "Unable to change automatic calendar sync.",
        );
      }

      setStatus(
        payload.status,
      );
    } catch (
      issue
    ) {
      setError(
        issue instanceof Error
          ? issue.message
          : String(
              issue,
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }

  return (
    <section
      style={{
        maxWidth:
          760,
        margin:
          "0 auto",
        padding:
          24,
        border:
          "1px solid rgba(255,255,255,0.12)",
        borderRadius:
          12,
        background:
          "rgba(6,10,16,0.88)",
      }}
    >
      <h1>
        PA-5 Google Calendar Steward
      </h1>

      <p>
        PA-4 is the authoritative source. PA-5 may create,
        update, or remove only Chernobog-managed work events.
        Unrelated calendar events are never modified.
      </p>

      {error ? (
        <pre
          style={{
            whiteSpace:
              "pre-wrap",
          }}
        >
          {error}
        </pre>
      ) : null}

      {!status ? (
        <p>
          Loading calendar status…
        </p>
      ) : (
        <>
          <dl>
            <dt>
              OAuth client
            </dt>
            <dd>
              {status.clientConfigured
                ? "Configured"
                : "Needs configuration"}
            </dd>

            <dt>
              Google Calendar
            </dt>
            <dd>
              {status.connected
                ? "Connected"
                : "Not connected"}
            </dd>

            <dt>
              Target calendar
            </dt>
            <dd>
              {status.calendarId}
            </dd>

            <dt>
              Automatic PA-4 sync
            </dt>
            <dd>
              {status.autoSyncWorkSchedule
                ? "Enabled"
                : "Disabled"}
            </dd>

            <dt>
              Event title
            </dt>
            <dd>
              {status.eventTitle}
            </dd>
          </dl>

          {!status.clientConfigured ? (
            <p>
              Configure the PA-5 Google OAuth environment variables,
              restart Chernobog, then connect the account.
              Callback URI: {status.redirectUri}
            </p>
          ) : null}

          <div
            style={{
              display:
                "flex",
              gap:
                12,
              flexWrap:
                "wrap",
              marginTop:
                16,
            }}
          >
            {!status.connected ? (
              <button
                disabled={
                  !status.clientConfigured ||
                  busy
                }
                onClick={
                  () => {
                    window.location.href =
                      "/api/personal-assistance/calendar/google/connect";
                  }
                }
              >
                Connect Google Calendar
              </button>
            ) : (
              <button
                disabled={
                  busy
                }
                onClick={
                  () =>
                    void syncNow()
                }
              >
                Sync PA-4 roster now
              </button>
            )}

            <button
              disabled={
                busy
              }
              onClick={
                () =>
                  void toggleAutoSync()
              }
            >
              {status.autoSyncWorkSchedule
                ? "Disable automatic sync"
                : "Enable automatic sync"}
            </button>
          </div>

          {status.lastSync ? (
            <div
              style={{
                marginTop:
                  20,
              }}
            >
              <h2>
                Last reconciliation
              </h2>
              <p>
                {status.lastSync.disposition}
              </p>
              <p>
                Created {status.lastSync.created},
                updated {status.lastSync.updated},
                removed {status.lastSync.deleted},
                unchanged {status.lastSync.unchanged}.
              </p>
              <p>
                Conflicts detected: {status.lastSync.conflictCount}
              </p>
              {status.lastSync.error ? (
                <pre>
                  {status.lastSync.error}
                </pre>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
