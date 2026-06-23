export type TikTokArchiveImportResult = {
  ok: true;
  importId: string;
  importedAt: string;
  archivePath: string;
  urlsFound: number;
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

export type TikTokImportSummary = {
  importId: string;
  importedAt: string;
  archivePath: string;
  urlsFound: number;
  summaryPath: string;
  parsedJsonPath: string;
};
