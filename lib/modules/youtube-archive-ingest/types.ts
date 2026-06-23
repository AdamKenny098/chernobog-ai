export type YouTubeSavedArchiveImportResult = {
  ok: true;
  importId: string;
  importedAt: string;
  archivePath: string;
  videosFound: number;
  summaryPath: string;
  parsedJsonPath: string;
  savedContent: {
    added: number;
    updated: number;
    unchanged: number;
    total: number;
    queuePath: string;
  };
};

export type YouTubeSavedArchiveImportSummary = {
  importId: string;
  importedAt: string;
  archivePath: string;
  videosFound: number;
  summaryPath: string;
  parsedJsonPath: string;
};
