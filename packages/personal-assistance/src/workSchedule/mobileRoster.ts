import {
  createHash,
} from "node:crypto";
import {
  zonedLocalToIso,
} from "./alkimii";
import type {
  WorkScheduleSnapshot,
  WorkShift,
} from "./types";

const MONTHS:
  Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

function hash(
  value: string,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function normalize(
  value: string,
): string {
  return value
    .replace(/\s+/gu, " ")
    .trim();
}

const WEEKDAYS:
  Record<string, number> = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tues: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
  };

function parseWeekdayOnly(
  raw: string,
): number | null {
  const key =
    normalize(raw)
      .toLowerCase()
      .replace(/[.,]/gu, "");

  return Object.prototype.hasOwnProperty.call(
    WEEKDAYS,
    key,
  )
    ? WEEKDAYS[key]
    : null;
}

function isWeekRangeText(
  raw: string,
): boolean {
  const value =
    normalize(raw);

  return (
    /^\d{1,2}\s*(?:-|\u2013|\u2014)\s*\d{1,2}\s+[a-z]{3,9}(?:\s+\d{4})?$/iu.test(
      value,
    ) ||
    /^\d{1,2}\s+[a-z]{3,9}\s*(?:-|\u2013|\u2014)\s*\d{1,2}\s+[a-z]{3,9}(?:\s+\d{4})?$/iu.test(
      value,
    )
  );
}

function nearestDateForWeekdayAndDay(
  day: number,
  weekday: number,
  observedAt: Date,
): string | null {
  if (
    day < 1 ||
    day > 31 ||
    weekday < 0 ||
    weekday > 6
  ) {
    return null;
  }

  let best:
    {
      date: Date;
      distance: number;
    } | null =
    null;

  const anchor =
    Date.UTC(
      observedAt.getUTCFullYear(),
      observedAt.getUTCMonth(),
      observedAt.getUTCDate(),
      12,
      0,
      0,
    );

  for (
    let offset = -45;
    offset <= 45;
    offset += 1
  ) {
    const candidate =
      new Date(
        anchor +
        offset *
          24 *
          60 *
          60 *
          1000,
      );

    if (
      candidate.getUTCDate() !==
        day ||
      candidate.getUTCDay() !==
        weekday
    ) {
      continue;
    }

    const distance =
      Math.abs(
        candidate.getTime() -
        observedAt.getTime(),
      );

    if (
      !best ||
      distance <
        best.distance
    ) {
      best = {
        date:
          candidate,
        distance,
      };
    }
  }

  return best
    ? best.date
        .toISOString()
        .slice(
          0,
          10,
        )
    : null;
}

function chooseYear(
  month: number,
  day: number,
  observedAt: Date,
): number {
  const years = [
    observedAt.getUTCFullYear() - 1,
    observedAt.getUTCFullYear(),
    observedAt.getUTCFullYear() + 1,
  ];

  return years
    .map(
      (year) => ({
        year,
        distance:
          Math.abs(
            Date.UTC(
              year,
              month - 1,
              day,
            ) -
            observedAt.getTime(),
          ),
      }),
    )
    .sort(
      (a, b) =>
        a.distance -
        b.distance,
    )[0].year;
}

function validDate(
  year: number,
  month: number,
  day: number,
): string | null {
  const candidate =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );

  if (
    candidate.getUTCFullYear() !==
      year ||
    candidate.getUTCMonth() !==
      month - 1 ||
    candidate.getUTCDate() !==
      day
  ) {
    return null;
  }

  return [
    year,
    String(month).padStart(
      2,
      "0",
    ),
    String(day).padStart(
      2,
      "0",
    ),
  ].join("-");
}

function parseDateText(
  raw: string,
  observedAt: Date,
): string | null {
  const value =
    normalize(
      raw,
    );

  const numeric =
    /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2}|\d{4}))?\b/u.exec(
      value,
    );

  if (numeric) {
    const day =
      Number(
        numeric[1],
      );

    const month =
      Number(
        numeric[2],
      );

    const rawYear =
      numeric[3];

    const year =
      rawYear
        ? rawYear.length ===
            2
          ? 2000 +
            Number(
              rawYear,
            )
          : Number(
              rawYear,
            )
        : chooseYear(
            month,
            day,
            observedAt,
          );

    return validDate(
      year,
      month,
      day,
    );
  }

  const dayMonth =
    /\b(?:mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)[,\s-]*(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:\s+(\d{4}))?\b/iu.exec(
      value,
    ) ??
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})(?:\s+(\d{4}))?\b/iu.exec(
      value,
    );

  if (dayMonth) {
    const day =
      Number(
        dayMonth[1],
      );

    const month =
      MONTHS[
        dayMonth[2]
          .toLowerCase()
      ];

    if (!month) {
      return null;
    }

    const year =
      dayMonth[3]
        ? Number(
            dayMonth[3],
          )
        : chooseYear(
            month,
            day,
            observedAt,
          );

    return validDate(
      year,
      month,
      day,
    );
  }

  const monthDay =
    /\b([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/iu.exec(
      value,
    );

  if (monthDay) {
    const month =
      MONTHS[
        monthDay[1]
          .toLowerCase()
      ];

    if (!month) {
      return null;
    }

    const day =
      Number(
        monthDay[2],
      );

    const year =
      monthDay[3]
        ? Number(
            monthDay[3],
          )
        : chooseYear(
            month,
            day,
            observedAt,
          );

    return validDate(
      year,
      month,
      day,
    );
  }

  return null;
}

function canonicalClock(
  rawHour: string,
  rawMinute: string | undefined,
  rawMeridiem:
    string | undefined,
): string | null {
  let hour =
    Number(
      rawHour,
    );

  const minute =
    Number(
      rawMinute ??
      "0",
    );

  const meridiem =
    rawMeridiem
      ?.toLowerCase();

  if (
    meridiem === "pm" &&
    hour < 12
  ) {
    hour +=
      12;
  }

  if (
    meridiem === "am" &&
    hour === 12
  ) {
    hour =
      0;
  }

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return `${String(
    hour,
  ).padStart(
    2,
    "0",
  )}:${String(
    minute,
  ).padStart(
    2,
    "0",
  )}`;
}

function parseTimeRange(
  raw: string,
): {
  start: string;
  end: string;
} | null {
  const value =
    normalize(
      raw,
    );

  const match =
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|Ã¢â‚¬â€œ|Ã¢â‚¬â€|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/iu.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const start =
    canonicalClock(
      match[1],
      match[2],
      match[3],
    );

  const end =
    canonicalClock(
      match[4],
      match[5],
      match[6],
    );

  if (
    !start ||
    !end
  ) {
    return null;
  }

  return {
    start,
    end,
  };
}

function parseSingleTime(
  raw: string,
): string | null {
  const match =
    /^\s*(\d{1,2})(?::(\d{2}))\s*(am|pm)?\s*$/iu.exec(
      raw,
    );

  if (!match) {
    return null;
  }

  return canonicalClock(
    match[1],
    match[2],
    match[3],
  );
}

function nextDate(
  date: string,
): string {
  const value =
    new Date(
      `${date}T12:00:00Z`,
    );

  value.setUTCDate(
    value.getUTCDate() +
    1,
  );

  return value
    .toISOString()
    .slice(
      0,
      10,
    );
}

function makeShift(
  date: string,
  start: string,
  end: string,
  timeZone: string,
): WorkShift {
  const startAt =
    zonedLocalToIso(
      date,
      start,
      timeZone,
    );

  let endDate =
    date;

  let endAt =
    zonedLocalToIso(
      endDate,
      end,
      timeZone,
    );

  if (
    Date.parse(
      endAt,
    ) <=
    Date.parse(
      startAt,
    )
  ) {
    endDate =
      nextDate(
        date,
      );

    endAt =
      zonedLocalToIso(
        endDate,
        end,
        timeZone,
      );
  }

  const fingerprint =
    hash(
      [
        date,
        startAt,
        endAt,
        "scheduled",
      ].join("|"),
    );

  return {
    id:
      `shift_${hash(
        `alkimii-mobile:${date}:${startAt}:${endAt}`,
      ).slice(
        0,
        24,
      )}`,
    source:
      "alkimii",
    date,
    startAt,
    endAt,
    status:
      "scheduled",
    fingerprint,
  };
}

export function parseAlkimiiMobileRoster(
  rawNodes: string[],
  options: {
    timeZone: string;
    observedAt?: string;
  },
): WorkShift[] {
  if (
    !Array.isArray(
      rawNodes,
    ) ||
    rawNodes.length <
      1 ||
    rawNodes.length >
      600
  ) {
    throw new Error(
      "Alkimii roster capture must contain between 1 and 600 visible text nodes.",
    );
  }

  const nodes =
    rawNodes
      .map(
        (
          value,
        ) => {
          if (
            typeof value !==
            "string"
          ) {
            throw new Error(
              "Alkimii roster text nodes must be strings.",
            );
          }

          return normalize(
            value,
          );
        },
      )
      .filter(
        (
          value,
        ) =>
          value.length >
          0,
      )
      .filter(
        (
          value,
          index,
          all,
        ) =>
          index ===
            0 ||
          value !==
            all[index - 1],
      );

  const totalCharacters =
    nodes.reduce(
      (
        total,
        value,
      ) =>
        total +
        value.length,
      0,
    );

  if (
    totalCharacters >
    60_000
  ) {
    throw new Error(
      "Alkimii roster capture is too large.",
    );
  }

  const observedAt =
    options.observedAt
      ? new Date(
          options.observedAt,
        )
      : new Date();

  if (
    Number.isNaN(
      observedAt.getTime(),
    )
  ) {
    throw new Error(
      "observedAt must be a valid timestamp.",
    );
  }

  const shifts:
    WorkShift[] = [];

  let currentDate:
    string | null =
    null;

  let pendingWeekday:
    number | null =
    null;

  for (
    let index = 0;
    index <
    nodes.length;
    index += 1
  ) {
    const node =
      nodes[index];

    const weekday =
      parseWeekdayOnly(
        node,
      );

    if (
      weekday !==
      null
    ) {
      pendingWeekday =
        weekday;
      continue;
    }

    if (
      pendingWeekday !==
        null &&
      /^\d{1,2}$/u.test(
        node,
      )
    ) {
      const splitDate =
        nearestDateForWeekdayAndDay(
          Number(
            node,
          ),
          pendingWeekday,
          observedAt,
        );

      pendingWeekday =
        null;

      if (
        splitDate
      ) {
        currentDate =
          splitDate;
        continue;
      }
    }

    const parsedDate =
      isWeekRangeText(
        node,
      )
        ? null
        : parseDateText(
            node,
            observedAt,
          );

    if (parsedDate) {
      currentDate =
        parsedDate;
      pendingWeekday =
        null;
    }

    const range =
      parseTimeRange(
        node,
      );

    if (
      currentDate &&
      range
    ) {
      shifts.push(
        makeShift(
          currentDate,
          range.start,
          range.end,
          options.timeZone,
        ),
      );

      continue;
    }

    if (
      !currentDate
    ) {
      continue;
    }

    const start =
      parseSingleTime(
        node,
      );

    const end =
      index + 1 <
      nodes.length
        ? parseSingleTime(
            nodes[
              index + 1
            ],
          )
        : null;

    if (
      start &&
      end
    ) {
      shifts.push(
        makeShift(
          currentDate,
          start,
          end,
          options.timeZone,
        ),
      );

      index +=
        1;
    }
  }

  const unique =
    Array.from(
      new Map(
        shifts.map(
          (
            shift,
          ) => [
            shift.fingerprint,
            shift,
          ],
        ),
      ).values(),
    ).sort(
      (
        a,
        b,
      ) =>
        a.startAt.localeCompare(
          b.startAt,
        ),
    );

  if (
    unique.length ===
    0
  ) {
    throw new Error(
      "No work shifts could be parsed from the visible Alkimii roster. Open My Schedule Ã¢â€ â€™ Roster and make sure at least one dated shift is visible.",
    );
  }

  return unique;
}

export function buildAlkimiiMobileSnapshot(
  rawNodes: string[],
  options: {
    timeZone: string;
    observedAt?: string;
    captureId: string;
  },
): WorkScheduleSnapshot {
  const shifts =
    parseAlkimiiMobileRoster(
      rawNodes,
      {
        timeZone:
          options.timeZone,
        observedAt:
          options.observedAt,
      },
    );

  const importedAt =
    new Date()
      .toISOString();

  const observedAt =
    options.observedAt ??
    importedAt;

  const snapshotId =
    `schedule_${hash(
      shifts
        .map(
          (
            shift,
          ) =>
            shift.fingerprint,
        )
        .sort()
        .join("|"),
    ).slice(
      0,
      32,
    )}`;

  return {
    schemaVersion:
      1,
    snapshotId,
    source:
      "alkimii",
    importedAt,
    observedAt,
    fileName:
      `mobile-roster:${options.captureId}`,
    timeZone:
      options.timeZone,
    shifts,
  };
}
