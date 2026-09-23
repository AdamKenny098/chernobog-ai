import { createHash } from "node:crypto";
import type {
  WorkScheduleSnapshot,
  WorkShift,
  WorkShiftStatus,
} from "./types";

type ParsedRow = Record<string, string>;

const DATE_KEYS = [
  "date",
  "shiftdate",
  "rosterdate",
  "day",
  "workdate",
];

const START_KEYS = [
  "start",
  "starttime",
  "from",
  "scheduledstart",
  "shiftstart",
  "rosteredstart",
];

const END_KEYS = [
  "end",
  "endtime",
  "finish",
  "finishtime",
  "to",
  "scheduledend",
  "shiftend",
  "rosteredend",
];

const START_DATETIME_KEYS = [
  "startdatetime",
  "shiftstartdatetime",
  "scheduledstartdatetime",
];

const END_DATETIME_KEYS = [
  "enddatetime",
  "shiftenddatetime",
  "scheduledenddatetime",
];

const ID_KEYS = [
  "shiftid",
  "id",
  "rosterid",
  "alkimiiid",
];

const ROLE_KEYS = [
  "role",
  "position",
  "job",
  "shifttype",
  "type",
];

const DEPARTMENT_KEYS = [
  "department",
  "dept",
  "team",
];

const LOCATION_KEYS = [
  "location",
  "site",
  "venue",
  "property",
  "area",
];

const STATUS_KEYS = [
  "status",
  "shiftstatus",
  "attendance",
  "leavetype",
];

function hash(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function normalizedHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "");
}

function chooseDelimiter(text: string): string {
  const first =
    text.split(/\r?\n/u)[0] ?? "";

  const candidates = [",", ";", "\t"];

  return candidates
    .map((delimiter) => ({
      delimiter,
      count:
        first.split(delimiter).length,
    }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

function parseCsv(text: string): string[][] {
  const delimiter =
    chooseDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char =
      text[i];

    if (quoted) {
      if (
        char === '"' &&
        text[i + 1] === '"'
      ) {
        cell += '"';
        i += 1;
        continue;
      }

      if (char === '"') {
        quoted = false;
        continue;
      }

      cell += char;
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.replace(/\r$/u, ""));

  if (
    row.some((value) => value.trim().length > 0)
  ) {
    rows.push(row);
  }

  return rows;
}

function lookup(
  row: ParsedRow,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value =
      row[key]?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

function parseDatePart(
  raw: string,
): string {
  const value =
    raw.trim();

  const iso =
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(
      value,
    );

  if (iso) {
    return [
      iso[1],
      iso[2].padStart(2, "0"),
      iso[3].padStart(2, "0"),
    ].join("-");
  }

  const european =
    /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/u.exec(
      value,
    );

  if (european) {
    const year =
      european[3].length === 2
        ? `20${european[3]}`
        : european[3];

    return [
      year,
      european[2].padStart(2, "0"),
      european[1].padStart(2, "0"),
    ].join("-");
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `Unable to parse Alkimii shift date: ${raw}`,
    );
  }

  return [
    parsed.getFullYear(),
    String(
      parsed.getMonth() + 1,
    ).padStart(2, "0"),
    String(
      parsed.getDate(),
    ).padStart(2, "0"),
  ].join("-");
}

function parseClock(
  raw: string,
): {
  hour: number;
  minute: number;
} {
  const value =
    raw.trim();

  const match =
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/iu.exec(
      value,
    );

  if (!match) {
    throw new Error(
      `Unable to parse Alkimii shift time: ${raw}`,
    );
  }

  let hour =
    Number(match[1]);

  const minute =
    Number(
      match[2] ?? "0",
    );

  const meridiem =
    match[3]?.toLowerCase();

  if (
    meridiem === "pm" &&
    hour < 12
  ) {
    hour += 12;
  }

  if (
    meridiem === "am" &&
    hour === 12
  ) {
    hour = 0;
  }

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(
      `Invalid Alkimii shift time: ${raw}`,
    );
  }

  return {
    hour,
    minute,
  };
}

function timeZoneParts(
  date: Date,
  timeZone: string,
): Record<string, number> {
  const formatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      },
    );

  const result:
    Record<string, number> = {};

  for (
    const part of
    formatter.formatToParts(date)
  ) {
    if (
      part.type === "literal"
    ) {
      continue;
    }

    result[part.type] =
      Number(part.value);
  }

  return result;
}

export function zonedLocalToIso(
  datePart: string,
  rawTime: string,
  timeZone: string,
): string {
  const [
    year,
    month,
    day,
  ] =
    datePart
      .split("-")
      .map(Number);

  const {
    hour,
    minute,
  } =
    parseClock(rawTime);

  const desiredUtc =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
    );

  let candidate =
    new Date(desiredUtc);

  for (
    let attempt = 0;
    attempt < 2;
    attempt += 1
  ) {
    const parts =
      timeZoneParts(
        candidate,
        timeZone,
      );

    const representedUtc =
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second ?? 0,
      );

    candidate =
      new Date(
        candidate.getTime() +
        (
          desiredUtc -
          representedUtc
        ),
      );
  }

  return candidate.toISOString();
}

function parseCombinedDateTime(
  value: string,
  timeZone: string,
): {
  date: string;
  iso: string;
} {
  const trimmed =
    value.trim();

  const direct =
    new Date(trimmed);

  if (
    /(?:Z|[+-]\d{2}:?\d{2})$/u.test(trimmed) &&
    !Number.isNaN(
      direct.getTime(),
    )
  ) {
    return {
      date:
        direct.toISOString().slice(0, 10),
      iso:
        direct.toISOString(),
    };
  }

  const parts =
    /^(.+?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)$/iu.exec(
      trimmed,
    );

  if (!parts) {
    throw new Error(
      `Unable to parse Alkimii date/time: ${value}`,
    );
  }

  const date =
    parseDatePart(
      parts[1],
    );

  return {
    date,
    iso:
      zonedLocalToIso(
        date,
        parts[2],
        timeZone,
      ),
  };
}

function normalizeStatus(
  raw?: string,
): WorkShiftStatus {
  const text =
    raw?.toLowerCase() ?? "";

  if (
    /holiday|vacation|bank holiday/u.test(
      text,
    )
  ) {
    return "holiday";
  }

  if (
    /absent|sick|leave|off/u.test(
      text,
    )
  ) {
    return "absence";
  }

  if (
    /training/u.test(
      text,
    )
  ) {
    return "training";
  }

  if (
    !text ||
    /normal|scheduled|rostered/u.test(
      text,
    )
  ) {
    return "scheduled";
  }

  return "other";
}

function buildRows(
  csvText: string,
): ParsedRow[] {
  if (
    csvText.trim().length === 0
  ) {
    throw new Error(
      "Alkimii CSV is empty.",
    );
  }

  if (
    csvText.length >
    4_000_000
  ) {
    throw new Error(
      "Alkimii CSV cannot exceed 4 MB.",
    );
  }

  const table =
    parseCsv(
      csvText.replace(/^\uFEFF/u, ""),
    );

  if (
    table.length < 2
  ) {
    throw new Error(
      "Alkimii CSV must contain a header row and at least one shift.",
    );
  }

  const headers =
    table[0].map(
      normalizedHeader,
    );

  return table
    .slice(1)
    .filter(
      (row) =>
        row.some(
          (value) =>
            value.trim().length > 0,
        ),
    )
    .map(
      (values) => {
        const result:
          ParsedRow = {};

        for (
          let index = 0;
          index <
          headers.length;
          index += 1
        ) {
          const header =
            headers[index];

          if (!header) {
            continue;
          }

          result[header] =
            values[index]?.trim() ?? "";
        }

        return result;
      },
    );
}

export function parseAlkimiiCsv(
  csvText: string,
  timeZone: string,
): WorkShift[] {
  const rows =
    buildRows(csvText);

  const shifts =
    rows.map(
      (
        row,
        index,
      ): WorkShift => {
        const combinedStart =
          lookup(
            row,
            START_DATETIME_KEYS,
          );

        const combinedEnd =
          lookup(
            row,
            END_DATETIME_KEYS,
          );

        let date: string;
        let startAt: string;
        let endAt: string;

        if (
          combinedStart &&
          combinedEnd
        ) {
          const start =
            parseCombinedDateTime(
              combinedStart,
              timeZone,
            );

          const end =
            parseCombinedDateTime(
              combinedEnd,
              timeZone,
            );

          date =
            start.date;
          startAt =
            start.iso;
          endAt =
            end.iso;
        } else {
          const rawDate =
            lookup(
              row,
              DATE_KEYS,
            );

          const rawStart =
            lookup(
              row,
              START_KEYS,
            );

          const rawEnd =
            lookup(
              row,
              END_KEYS,
            );

          if (
            !rawDate ||
            !rawStart ||
            !rawEnd
          ) {
            throw new Error(
              `Alkimii CSV row ${index + 2} is missing date/start/end columns. Supported examples include Date, Start, Finish, Shift Date, Start Time and End Time.`,
            );
          }

          date =
            parseDatePart(
              rawDate,
            );

          startAt =
            zonedLocalToIso(
              date,
              rawStart,
              timeZone,
            );

          let endDate =
            date;

          const startMs =
            Date.parse(
              startAt,
            );

          let endCandidate =
            zonedLocalToIso(
              endDate,
              rawEnd,
              timeZone,
            );

          if (
            Date.parse(
              endCandidate,
            ) <= startMs
          ) {
            const nextDay =
              new Date(
                `${date}T12:00:00Z`,
              );

            nextDay.setUTCDate(
              nextDay.getUTCDate() + 1,
            );

            endDate =
              nextDay
                .toISOString()
                .slice(0, 10);

            endCandidate =
              zonedLocalToIso(
                endDate,
                rawEnd,
                timeZone,
              );
          }

          endAt =
            endCandidate;
        }

        const sourceShiftId =
          lookup(
            row,
            ID_KEYS,
          );

        const role =
          lookup(
            row,
            ROLE_KEYS,
          );

        const department =
          lookup(
            row,
            DEPARTMENT_KEYS,
          );

        const location =
          lookup(
            row,
            LOCATION_KEYS,
          );

        const status =
          normalizeStatus(
            lookup(
              row,
              STATUS_KEYS,
            ) ??
            role,
          );

        const fingerprint =
          hash(
            [
              sourceShiftId ?? "",
              date,
              startAt,
              endAt,
              role ?? "",
              department ?? "",
              location ?? "",
              status,
            ].join("|"),
          );

        return {
          id:
            `shift_${hash(
              sourceShiftId
                ? `alkimii:${sourceShiftId}`
                : `alkimii:${date}:${startAt}:${role ?? ""}:${department ?? ""}:${location ?? ""}`,
            ).slice(0, 24)}`,
          sourceShiftId,
          source:
            "alkimii",
          date,
          startAt,
          endAt,
          role,
          department,
          location,
          status,
          fingerprint,
        };
      },
    );

  return shifts.sort(
    (a, b) =>
      a.startAt.localeCompare(
        b.startAt,
      ),
  );
}

export function buildAlkimiiSnapshot(
  csvText: string,
  options: {
    timeZone: string;
    fileName?: string;
    observedAt?: string;
    importedAt?: string;
  },
): WorkScheduleSnapshot {
  const shifts =
    parseAlkimiiCsv(
      csvText,
      options.timeZone,
    );

  const importedAt =
    options.importedAt ??
    new Date().toISOString();

  const observedAt =
    options.observedAt ??
    importedAt;

  const snapshotId =
    `schedule_${hash(
      shifts
        .map(
          (shift) =>
            shift.fingerprint,
        )
        .sort()
        .join("|"),
    ).slice(0, 32)}`;

  return {
    schemaVersion:
      1,
    snapshotId,
    source:
      "alkimii",
    importedAt,
    observedAt,
    fileName:
      options.fileName,
    timeZone:
      options.timeZone,
    shifts,
  };
}
