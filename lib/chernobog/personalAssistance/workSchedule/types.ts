export type WorkScheduleSource = "alkimii";

export type WorkShiftStatus =
  | "scheduled"
  | "holiday"
  | "absence"
  | "training"
  | "other";

export type WorkScheduleChangeKind =
  | "added"
  | "removed"
  | "changed";

export type WorkShift = {
  id: string;
  sourceShiftId?: string;
  source: WorkScheduleSource;
  date: string;
  startAt: string;
  endAt: string;
  role?: string;
  department?: string;
  location?: string;
  status: WorkShiftStatus;
  fingerprint: string;
};

export type WorkScheduleSnapshot = {
  schemaVersion: 1;
  snapshotId: string;
  source: WorkScheduleSource;
  importedAt: string;
  observedAt: string;
  fileName?: string;
  timeZone: string;
  shifts: WorkShift[];
};

export type WorkScheduleChange = {
  kind: WorkScheduleChangeKind;
  key: string;
  before?: WorkShift;
  after?: WorkShift;
};

export type WorkScheduleSignal = {
  eventId: string;
  source: WorkScheduleSource;
  observedAt: string;
  confidence: number;
  reason: string;
  appPackage?: string;
  appLabel?: string;
};

export type WorkScheduleState = {
  schemaVersion: 1;
  source: WorkScheduleSource;
  latestSnapshot: WorkScheduleSnapshot | null;
  latestChanges: WorkScheduleChange[];
  latestSignal: WorkScheduleSignal | null;
  pendingRefresh: boolean;
  seenSignalIds: string[];
};

export type WorkScheduleImportResult = {
  disposition: "baseline" | "updated" | "confirmed";
  snapshot: WorkScheduleSnapshot;
  changes: WorkScheduleChange[];
};

export type WorkScheduleStatus = {
  source: WorkScheduleSource;
  preferredSource: string | null;
  staleAfterMinutes: number;
  isStale: boolean;
  pendingRefresh: boolean;
  lastImportedAt: string | null;
  latestSignal: WorkScheduleSignal | null;
  latestChanges: WorkScheduleChange[];
  snapshot: WorkScheduleSnapshot | null;
  nextShift: WorkShift | null;
  boundaries: {
    executesTools: false;
    grantsPermissions: false;
    createsCalendarEvents: false;
    sendsMessages: false;
  };
};
