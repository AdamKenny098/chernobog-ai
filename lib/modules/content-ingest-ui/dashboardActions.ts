import {
  executeContentIngestCommand,
} from "@/lib/modules/content-ingest";
import {
  executeContentReviewCommand,
} from "@/lib/modules/content-review";
import {
  executeSavedContentReliabilityCommand,
  isSavedContentReliabilityCommand,
} from "@/lib/modules/saved-content-reliability";
import {
  executeSavedContentCommand,
  getActiveSavedContentItems,
  isSavedContentCommand,
  updateSavedContentItemById,
} from "@/lib/modules/saved-content";
import {
  executeYouTubeIngestCommand,
} from "@/lib/modules/youtube-ingest";

import {
  refreshSavedContentThumbnails,
} from "./thumbnailScraper";
import {
  ContentIngestUiActionResult,
  DashboardActionRequest,
} from "./types";

async function savedContentIndexForItemId(itemId: string) {
  const active = await getActiveSavedContentItems(10000);
  const index = active.findIndex((item) => item.id === itemId);

  return index >= 0 ? index + 1 : null;
}

async function runSavedContentCommandForItem(
  itemId: string,
  commandFactory: (activeIndex: number) => string
): Promise<ContentIngestUiActionResult> {
  const activeIndex = await savedContentIndexForItemId(itemId);

  if (!activeIndex) {
    return {
      ok: false,
      title: "Item is not active",
      message: [
        `Item ID: ${itemId}`,
        "",
        "This action requires the item to be in the active queue.",
      ].join("\n"),
    };
  }

  return executeSavedContentCommand(commandFactory(activeIndex));
}

async function runQueueAction(
  request: Extract<DashboardActionRequest, { type: "queue-action" }>
): Promise<ContentIngestUiActionResult> {
  if (request.action === "archive") {
    try {
      await updateSavedContentItemById({
        id: request.itemId,
        queueStatus: "archived",
        patch: {
          updatedAt: new Date().toISOString(),
        },
      });

      return {
        ok: true,
        title: "Saved content archived",
        message: `Archived item: ${request.itemId}`,
      };
    } catch {
      return runSavedContentCommandForItem(
        request.itemId,
        (index) => `archive saved content ${index}`
      );
    }
  }

  if (request.action === "dismiss") {
    try {
      await updateSavedContentItemById({
        id: request.itemId,
        queueStatus: "dismissed",
        patch: {
          updatedAt: new Date().toISOString(),
        },
      });

      return {
        ok: true,
        title: "Saved content dismissed",
        message: `Dismissed item: ${request.itemId}`,
      };
    } catch {
      return runSavedContentCommandForItem(
        request.itemId,
        (index) => `dismiss saved content ${index}`
      );
    }
  }

  const commandByAction: Record<string, (index: number) => string> = {
    "watch-next": (index) => `watch next saved content ${index}`,
    "analyze-next": (index) => `analyze next saved content ${index}`,
    "fetch-transcript": (index) => `fetch transcript for saved content ${index}`,
    "chunk-transcript": (index) => `chunk transcript for saved content ${index}`,
    summarize: (index) => `summarize saved content ${index}`,
    reason: (index) => `why did I save content ${index}`,
    "extract-candidates": (index) => `extract candidates from saved content ${index}`,
    "create-review": (index) => `create saved content review for item ${index}`,
    "mark-watched": (index) => `mark saved content ${index} watched`,
    "mark-analyzed": (index) => `mark saved content ${index} analyzed`,
  };

  const commandFactory = commandByAction[request.action];

  if (!commandFactory) {
    return {
      ok: false,
      title: "Unsupported queue action",
      message: request.action,
    };
  }

  return runSavedContentCommandForItem(request.itemId, commandFactory);
}

async function runReviewAction(
  request: Extract<DashboardActionRequest, { type: "review-action" }>
): Promise<ContentIngestUiActionResult> {
  const commandByAction: Record<string, string> = {
    show: `show saved content review ${request.reviewId}`,
    "approve-all": `approve all review ${request.reviewId}`,
    "reject-all": `reject all review ${request.reviewId}`,
    apply: `apply saved content review ${request.reviewId}`,
  };

  const command = commandByAction[request.action];

  if (!command) {
    return {
      ok: false,
      title: "Unsupported review action",
      message: request.action,
    };
  }

  return executeContentReviewCommand(command);
}

async function runImportAction(
  request: Extract<DashboardActionRequest, { type: "import" }>
): Promise<ContentIngestUiActionResult> {
  const value = request.value.trim();

  if (!value) {
    return {
      ok: false,
      title: "Missing import value",
      message: "Provide an archive path or playlist URL.",
    };
  }

  if (request.source === "playlist-url") {
    if (request.platform !== "youtube") {
      return {
        ok: false,
        title: "Unsupported playlist import",
        message: "Playlist URL import currently supports YouTube only.",
      };
    }

    const ingestResult = await executeYouTubeIngestCommand(
      `ingest youtube playlist ${value}`
    );

    if (request.mode === "scan") {
      return ingestResult;
    }

    const bridgeResult = await executeContentIngestCommand(
      "import youtube archive .\\vault\\chernobog\\inbox\\youtube"
    );

    return {
      ok: ingestResult.ok && bridgeResult.ok,
      title: "YouTube playlist imported to saved content",
      message: [
        "Playlist ingest:",
        ingestResult.message,
        "",
        "Saved-content bridge:",
        bridgeResult.message,
      ].join("\n"),
      data: {
        ingestResult,
        bridgeResult,
      },
    };
  }

  const command = `${request.mode === "scan" ? "scan" : "import"} ${
    request.platform
  } archive ${value}`;

  if (request.mode === "scan-import") {
    const scanResult = await executeContentIngestCommand(
      `scan ${request.platform} archive ${value}`
    );
    const importResult = await executeContentIngestCommand(
      `import ${request.platform} archive ${value}`
    );

    return {
      ok: scanResult.ok && importResult.ok,
      title: `${request.platform} archive scanned and imported`,
      message: [
        "Scan:",
        scanResult.message,
        "",
        "Import:",
        importResult.message,
      ].join("\n"),
      data: {
        scanResult,
        importResult,
      },
    };
  }

  return executeContentIngestCommand(command);
}

export async function runDashboardAction(
  request: DashboardActionRequest
): Promise<ContentIngestUiActionResult> {
  if (request.type === "queue-action") {
    return runQueueAction(request);
  }

  if (request.type === "review-action") {
    return runReviewAction(request);
  }

  if (request.type === "import") {
    return runImportAction(request);
  }

  if (request.type === "refresh-thumbnails") {
    const result = await refreshSavedContentThumbnails(request.limit ?? 150, {
      force: request.force ?? true,
    });

    return {
      ok: true,
      title: "Saved content thumbnails refreshed",
      message: [
        `Scanned: ${result.scanned}`,
        `Updated: ${result.updated}`,
        `Available: ${result.available}`,
        `Failed: ${result.failed}`,
        `Unavailable: ${result.unavailable}`,
        `Total cached: ${result.total}`,
      ].join("\n"),
      data: result,
    };
  }

  if (request.type === "command") {
    const command = request.command.trim();

    if (isSavedContentReliabilityCommand(command)) {
      return executeSavedContentReliabilityCommand(command);
    }

    if (isSavedContentCommand(command)) {
      return executeSavedContentCommand(command);
    }

    return executeContentIngestCommand(command);
  }

  return {
    ok: false,
    title: "Unsupported dashboard action",
    message: "The dashboard action request was not recognized.",
  };
}
