import {
  applyApprovedContentReview,
} from "./applyReviewToVault";
import {
  createContentReviewFromSavedContentIndex,
} from "./createReviewFromSavedContent";
import {
  listContentReviews,
  readContentReview,
  setAllReviewCandidateStatuses,
  setReviewCandidateStatus,
} from "./store";
import {
  ContentReviewCommandResult,
  ContentReviewStatus,
  ReviewCandidateKind,
} from "./types";

function normalize(command: string) {
  return command.trim().replace(/\s+/g, " ");
}

function parseReviewId(command: string) {
  const match = command.match(/\b(scr-[a-zA-Z0-9_-]+)\b/);
  return match?.[1] ?? null;
}

function parseIndex(command: string) {
  const matches = command.match(/\b(\d+)\b/g);
  const last = matches?.[matches.length - 1];
  const value = last ? Number(last) : NaN;

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(1, Math.floor(value));
}

function parseCandidateKind(command: string): ReviewCandidateKind | null {
  if (/\bsummary\b/i.test(command)) return "summary";
  if (/\breason\b/i.test(command)) return "reason";
  if (/\bproject\b/i.test(command)) return "project";
  if (/\btask\b/i.test(command)) return "task";
  if (/\bidea\b/i.test(command)) return "idea";
  if (/\bwarning\b/i.test(command)) return "warning";
  return null;
}

function formatReviewList(reviews: Awaited<ReturnType<typeof listContentReviews>>) {
  if (reviews.length === 0) {
    return "No content reviews found.";
  }

  return reviews
    .map((review, index) => {
      return `${index + 1}. ${review.id} — ${review.title} [${review.status}/${review.platform}]`;
    })
    .join("\n");
}

function formatCandidates(label: string, values: Array<{ text: string; status: string; confidence: number; targetProject?: string }>) {
  if (values.length === 0) {
    return [`${label}:`, "- None"].join("\n");
  }

  return [
    `${label}:`,
    ...values.map((candidate, index) => {
      const target = candidate.targetProject ? ` -> ${candidate.targetProject}` : "";
      return `${index + 1}. [${candidate.status}] (${candidate.confidence}%) ${candidate.text}${target}`;
    }),
  ].join("\n");
}

export function isContentReviewCommand(command: string) {
  const normalized = normalize(command);

  return (
    /^create saved content review for item\s+\d+$/i.test(normalized) ||
    /^show saved content reviews$/i.test(normalized) ||
    /^show pending content reviews$/i.test(normalized) ||
    /^show applied content reviews$/i.test(normalized) ||
    /^show rejected content reviews$/i.test(normalized) ||
    /^show saved content review\s+scr-[a-zA-Z0-9_-]+$/i.test(normalized) ||
    /^(approve|reject) review\s+scr-[a-zA-Z0-9_-]+\s+(summary|reason|project|task|idea|warning)(?:\s+\d+)?$/i.test(normalized) ||
    /^(approve|reject) all review\s+scr-[a-zA-Z0-9_-]+$/i.test(normalized) ||
    /^apply saved content review\s+scr-[a-zA-Z0-9_-]+$/i.test(normalized)
  );
}

async function showReview(reviewId: string): Promise<ContentReviewCommandResult> {
  const review = await readContentReview(reviewId);

  if (!review) {
    return {
      ok: false,
      title: "Content review not found",
      message: `No content review found for ID: ${reviewId}`,
    };
  }

  return {
    ok: true,
    title: "Content Review",
    message: [
      `Review ID: ${review.id}`,
      `Status: ${review.status}`,
      `Source: ${review.title}`,
      `Platform: ${review.platform}`,
      `URL: ${review.sourceUrl}`,
      "",
      review.summary
        ? formatCandidates("Summary", [review.summary])
        : "Summary:\n- None",
      "",
      review.possibleReasonSaved
        ? formatCandidates("Possible Reason Saved", [review.possibleReasonSaved])
        : "Possible Reason Saved:\n- None",
      "",
      formatCandidates("Projects", review.projectLinks),
      "",
      formatCandidates("Tasks", review.tasks),
      "",
      formatCandidates("Ideas", review.ideas),
      "",
      formatCandidates("Warnings", review.warnings),
      "",
      "Commands:",
      `- approve review ${review.id} task 1`,
      `- reject review ${review.id} idea 1`,
      `- approve all review ${review.id}`,
      `- apply saved content review ${review.id}`,
    ].join("\n"),
    data: review,
  };
}

async function listReviewsByStatus(status?: ContentReviewStatus): Promise<ContentReviewCommandResult> {
  const reviews = await listContentReviews(status);

  return {
    ok: true,
    title: status ? `Content Reviews — ${status}` : "Content Reviews",
    message: formatReviewList(reviews),
    data: { reviews },
  };
}

export async function executeContentReviewCommand(
  command: string
): Promise<ContentReviewCommandResult> {
  const normalized = normalize(command);

  if (/^create saved content review for item\s+\d+$/i.test(normalized)) {
    const index = parseIndex(normalized);

    if (!index) {
      return {
        ok: false,
        title: "Content review creation failed",
        message: "No valid active saved content item number was found.",
      };
    }

    const result = await createContentReviewFromSavedContentIndex(index);

    if (!result) {
      return {
        ok: false,
        title: "Content review creation failed",
        message: [
          `No active saved content item exists at number ${index}.`,
          "",
          "Run first:",
          "show saved content items",
        ].join("\n"),
      };
    }

    return {
      ok: true,
      title: "Content review created",
      message: [
        `Review ID: ${result.review.id}`,
        `Status: ${result.review.status}`,
        `Source: ${result.review.title}`,
        "",
        "Files:",
        `- ${result.paths.jsonPath}`,
        `- ${result.paths.markdownPath}`,
        "",
        "Next:",
        `show saved content review ${result.review.id}`,
      ].join("\n"),
      data: result,
    };
  }

  if (/^show saved content reviews$/i.test(normalized)) {
    return listReviewsByStatus();
  }

  if (/^show pending content reviews$/i.test(normalized)) {
    return listReviewsByStatus("pending-review");
  }

  if (/^show applied content reviews$/i.test(normalized)) {
    return listReviewsByStatus("applied");
  }

  if (/^show rejected content reviews$/i.test(normalized)) {
    return listReviewsByStatus("rejected");
  }

  if (/^show saved content review\s+scr-[a-zA-Z0-9_-]+$/i.test(normalized)) {
    const reviewId = parseReviewId(normalized);

    if (!reviewId) {
      return {
        ok: false,
        title: "Content review lookup failed",
        message: "No review ID found.",
      };
    }

    return showReview(reviewId);
  }

  if (/^(approve|reject) all review\s+scr-[a-zA-Z0-9_-]+$/i.test(normalized)) {
    const reviewId = parseReviewId(normalized);
    const status = normalized.toLowerCase().startsWith("approve")
      ? "approved"
      : "rejected";

    if (!reviewId) {
      return {
        ok: false,
        title: "Review update failed",
        message: "No review ID found.",
      };
    }

    const result = await setAllReviewCandidateStatuses({
      reviewId,
      status,
    });

    if (!result) {
      return {
        ok: false,
        title: "Review update failed",
        message: `No content review found for ID: ${reviewId}`,
      };
    }

    return {
      ok: true,
      title: "Review candidates updated",
      message: [
        `Review ID: ${result.review.id}`,
        `New review status: ${result.review.status}`,
        `Set all candidates to: ${status}`,
      ].join("\n"),
      data: result,
    };
  }

  if (/^(approve|reject) review\s+scr-[a-zA-Z0-9_-]+\s+(summary|reason|project|task|idea|warning)(?:\s+\d+)?$/i.test(normalized)) {
    const reviewId = parseReviewId(normalized);
    const kind = parseCandidateKind(normalized);
    const visibleIndex = kind === "summary" || kind === "reason" ? 1 : parseIndex(normalized);
    const status = normalized.toLowerCase().startsWith("approve")
      ? "approved"
      : "rejected";

    if (!reviewId || !kind || !visibleIndex) {
      return {
        ok: false,
        title: "Review candidate update failed",
        message: "Missing review ID, candidate type, or candidate number.",
      };
    }

    const result = await setReviewCandidateStatus({
      reviewId,
      kind,
      visibleIndex,
      status,
    });

    if (!result) {
      return {
        ok: false,
        title: "Review candidate update failed",
        message: `Could not find ${kind} candidate ${visibleIndex} for review ${reviewId}.`,
      };
    }

    return {
      ok: true,
      title: "Review candidate updated",
      message: [
        `Review ID: ${result.review.id}`,
        `Candidate: ${result.candidate.text}`,
        `Status: ${result.candidate.status}`,
        `Review status: ${result.review.status}`,
      ].join("\n"),
      data: result,
    };
  }

  if (/^apply saved content review\s+scr-[a-zA-Z0-9_-]+$/i.test(normalized)) {
    const reviewId = parseReviewId(normalized);

    if (!reviewId) {
      return {
        ok: false,
        title: "Review apply failed",
        message: "No review ID found.",
      };
    }

    const result = await applyApprovedContentReview(reviewId);

    if (!result) {
      return {
        ok: false,
        title: "Review apply failed",
        message: `No content review found for ID: ${reviewId}`,
      };
    }

    return {
      ok: true,
      title: "Content review applied",
      message: [
        `Review ID: ${result.review.id}`,
        `Applied tasks: ${result.appliedTasks.length}`,
        `Applied ideas: ${result.appliedIdeas.length}`,
        `Applied project links: ${result.appliedProjectLinks.length}`,
        "",
        "Applied paths:",
        ...result.appliedPaths.map((outPath) => `- ${outPath}`),
      ].join("\n"),
      data: result,
    };
  }

  return {
    ok: false,
    title: "Content review command not recognized",
    message: [
      "Try one of these:",
      "- create saved content review for item 1",
      "- show saved content reviews",
      "- show saved content review <id>",
      "- approve review <id> task 1",
      "- reject review <id> idea 1",
      "- approve all review <id>",
      "- apply saved content review <id>",
    ].join("\n"),
  };
}
