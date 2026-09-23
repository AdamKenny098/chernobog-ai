"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Shift = {
  id: string;
  date: string;
  startAt: string;
  endAt: string;
  role?: string;
  department?: string;
  location?: string;
  status: string;
};

type Change = {
  kind:
    | "added"
    | "removed"
    | "changed";
  key: string;
};

type Status = {
  source: "alkimii";
  preferredSource:
    string | null;
  staleAfterMinutes:
    number;
  isStale:
    boolean;
  pendingRefresh:
    boolean;
  lastImportedAt:
    string | null;
  latestChanges:
    Change[];
  snapshot: {
    snapshotId:
      string;
    importedAt:
      string;
    fileName?: string;
    shifts:
      Shift[];
  } | null;
  nextShift:
    Shift | null;
};

function formatTime(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    undefined,
    {
      weekday:
        "short",
      month:
        "short",
      day:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    },
  );
}

export function WorkScheduleSurface() {
  const [
    status,
    setStatus,
  ] =
    useState<Status | null>(
      null,
    );

  const [
    expanded,
    setExpanded,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    importing,
    setImporting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const fileInput =
    useRef<HTMLInputElement | null>(
      null,
    );

  const load =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/personal-assistance/work-schedule",
              {
                cache:
                  "no-store",
              },
            );

          const payload =
            (await response.json()) as {
              ok?:
                boolean;
              status?:
                Status;
              message?:
                string;
            };

          if (
            !response.ok ||
            !payload.ok ||
            !payload.status
          ) {
            throw new Error(
              payload.message ??
                "Unable to read work schedule.",
            );
          }

          setStatus(
            payload.status,
          );
          setError(
            null,
          );
        } catch (
          caught
        ) {
          setError(
            caught instanceof Error
              ? caught.message
              : String(caught),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      const initialTimer =
        window.setTimeout(
          () => {
            void load();
          },
          0,
        );

      const timer =
        window.setInterval(
          () => {
            if (
              document.visibilityState ===
              "visible"
            ) {
              void load();
            }
          },
          30_000,
        );

      return () => {
        window.clearTimeout(
          initialTimer,
        );
        window.clearInterval(
          timer,
        );
      };
    },
    [load],
  );

  async function importCsv(
    file: File,
  ) {
    setImporting(
      true,
    );
    setError(
      null,
    );
    setMessage(
      null,
    );

    try {
      if (
        !/\.csv$/iu.test(
          file.name,
        )
      ) {
        throw new Error(
          "Choose the CSV export from Alkimii. Excel files are not imported directly.",
        );
      }

      const csvText =
        await file.text();

      const response =
        await fetch(
          "/api/personal-assistance/work-schedule/import",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                csvText,
                fileName:
                  file.name,
              }),
          },
        );

      const payload =
        (await response.json()) as {
          ok?:
            boolean;
          result?: {
            disposition?:
              string;
            changes?:
              unknown[];
          };
          message?:
            string;
        };

      if (
        !response.ok ||
        !payload.ok
      ) {
        throw new Error(
          payload.message ??
            "Alkimii schedule import failed.",
        );
      }

      const count =
        payload.result
          ?.changes
          ?.length ??
        0;

      setMessage(
        count > 0
          ? `Imported Alkimii schedule. ${count} change(s) detected.`
          : "Imported Alkimii schedule successfully.",
      );

      await load();
    } catch (
      caught
    ) {
      setError(
        caught instanceof Error
          ? caught.message
          : String(caught),
      );
    } finally {
      setImporting(
        false,
      );

      if (
        fileInput.current
      ) {
        fileInput.current.value =
          "";
      }
    }
  }

  const shifts =
    status?.snapshot
      ?.shifts ??
    [];

  return (
    <section
      aria-label="Work schedule"
      className="relative z-40 border-b border-[#35505c]/35 bg-[#020506]/94 backdrop-blur-sm"
    >
      <div className="flex min-h-11 flex-wrap items-center gap-3 px-5 py-2">
        <button
          type="button"
          onClick={() =>
            setExpanded(
              (
                value,
              ) =>
                !value,
            )
          }
          className="flex items-center gap-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300/80 shadow-[0_0_10px_rgba(103,232,249,0.35)]" />
          <span className="text-[8px] font-semibold uppercase tracking-[0.24em] text-cyan-200/75">
            Work Schedule
          </span>
          <span className="text-[7px] uppercase tracking-[0.15em] text-[#52707b]">
            Alkimii
          </span>
        </button>

        <div className="h-5 w-px bg-[#29454f]/45" />

        <div className="flex flex-wrap gap-3 font-mono text-[8px] uppercase tracking-[0.13em] text-[#52707b]">
          <span>
            Freshness{" "}
            <b
              className={
                status?.isStale
                  ? "font-normal text-amber-200"
                  : "font-normal text-emerald-200"
              }
            >
              {loading
                ? "loading"
                : status?.isStale
                  ? "stale"
                  : "fresh"}
            </b>
          </span>

          <span>
            Refresh{" "}
            <b
              className={
                status?.pendingRefresh
                  ? "font-normal text-amber-200"
                  : "font-normal text-[#7fa0aa]"
              }
            >
              {status?.pendingRefresh
                ? "needed"
                : "clear"}
            </b>
          </span>

          <span>
            Shifts{" "}
            <b className="font-normal text-cyan-100/80">
              {
                shifts.length
              }
            </b>
          </span>
        </div>

        <div className="min-w-0 flex-1 truncate text-right text-[8px] text-[#78929a]">
          {status?.nextShift
            ? `Next: ${formatTime(
                status.nextShift
                  .startAt,
              )}${
                status.nextShift
                  .role
                  ? ` Â· ${status.nextShift.role}`
                  : ""
              }`
            : "No upcoming shift loaded"}
        </div>

        <button
          type="button"
          onClick={() =>
            fileInput.current
              ?.click()
          }
          disabled={
            importing
          }
          className="border border-cyan-300/30 bg-cyan-950/10 px-2 py-1 text-[7px] font-semibold uppercase tracking-[0.14em] text-cyan-100/80 disabled:opacity-40"
        >
          {importing
            ? "importing"
            : "Import CSV"}
        </button>

        <input
          ref={
            fileInput
          }
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(
            event,
          ) => {
            const file =
              event.target
                .files?.[0];

            if (file) {
              void importCsv(
                file,
              );
            }
          }}
        />
      </div>

      {error ? (
        <div className="border-t border-red-400/20 bg-red-950/10 px-5 py-2 text-[8px] text-red-200/85">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="border-t border-emerald-400/15 bg-emerald-950/10 px-5 py-2 text-[8px] text-emerald-200/80">
          {
            message
          }
        </div>
      ) : null}

      {expanded ? (
        <div className="border-t border-[#29454f]/45 px-5 py-4">
          <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
            <div className="border border-[#29454f]/50 bg-black/20 p-3">
              <div className="text-[7px] uppercase tracking-[0.2em] text-[#62818a]">
                Adapter status
              </div>

              <div className="mt-2 grid gap-1.5 text-[8px] text-[#78929a]">
                <div>
                  Source:{" "}
                  <span className="text-cyan-100/80">
                    Alkimii
                  </span>
                </div>
                <div>
                  Preferred profile source:{" "}
                  <span className="text-[#a8c1c8]">
                    {status?.preferredSource ??
                      "not set"}
                  </span>
                </div>
                <div>
                  Last import:{" "}
                  <span className="text-[#a8c1c8]">
                    {status?.lastImportedAt
                      ? formatTime(
                          status.lastImportedAt,
                        )
                      : "never"}
                  </span>
                </div>
                <div>
                  Stale after:{" "}
                  <span className="text-[#a8c1c8]">
                    {status?.staleAfterMinutes ??
                      "â€”"}{" "}
                    minutes
                  </span>
                </div>
                <div>
                  Latest reconciliation:{" "}
                  <span className="text-[#a8c1c8]">
                    {status
                      ?.latestChanges
                      ?.length ??
                      0}{" "}
                    change(s)
                  </span>
                </div>
              </div>

              <p className="mt-3 text-[7px] leading-3 text-[#4f6972]">
                Import the CSV version of
                the Alkimii shift export.
                Notifications are used as
                change signals; this
                adapter does not scrape
                the Alkimii UI, alter
                shifts, create calendar
                events, or send messages.
              </p>
            </div>

            <div>
              <div className="mb-2 text-[7px] uppercase tracking-[0.2em] text-[#62818a]">
                Loaded shifts
              </div>

              {shifts.length ===
              0 ? (
                <div className="border border-dashed border-[#29454f]/45 px-4 py-8 text-center text-[8px] text-[#52707b]">
                  No Alkimii schedule has
                  been imported yet.
                </div>
              ) : (
                <div className="grid max-h-[360px] gap-1.5 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
                  {shifts.map(
                    (
                      shift,
                    ) => (
                      <div
                        key={
                          shift.id
                        }
                        className="border border-[#29454f]/45 bg-[#030607]/80 p-2.5"
                      >
                        <div className="text-[9px] font-semibold text-cyan-100/80">
                          {formatTime(
                            shift.startAt,
                          )}
                        </div>
                        <div className="mt-1 text-[8px] text-[#78929a]">
                          to{" "}
                          {formatTime(
                            shift.endAt,
                          )}
                        </div>
                        <div className="mt-2 text-[7px] uppercase tracking-[0.12em] text-[#55717a]">
                          {[
                            shift.role,
                            shift.department,
                            shift.location,
                            shift.status,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              " Â· ",
                            )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
