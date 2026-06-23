import {
  VaultBrainAnswer,
  VaultBrainSearchResult,
} from "./types";
import {
  sentenceSplit,
  tokenize,
  trimSnippet,
} from "./text";
import {
  searchVaultBrain,
} from "./search";

function calculateConfidence(results: VaultBrainSearchResult[]): VaultBrainAnswer["confidence"] {
  if (results.length === 0) {
    return "none";
  }

  const topScore = results[0]?.score ?? 0;
  const sourceCount = new Set(results.map((result) => result.chunk.relativePath)).size;
  const matchedTermCount = new Set(results.flatMap((result) => result.matchedTerms)).size;

  if (topScore >= 12 && sourceCount >= 2 && matchedTermCount >= 3) {
    return "high";
  }

  if (topScore >= 7 && matchedTermCount >= 2) {
    return "medium";
  }

  return "low";
}

function selectEvidenceSentences(question: string, results: VaultBrainSearchResult[]) {
  const terms = tokenize(question);
  const selected: Array<{
    sentence: string;
    sourceIndex: number;
    path: string;
  }> = [];

  for (const [sourceIndex, result] of results.entries()) {
    const sentences = sentenceSplit(result.chunk.text)
      .map((sentence) => {
        const lower = sentence.toLowerCase();
        const score = terms.reduce((total, term) => {
          return lower.includes(term) ? total + 1 : total;
        }, 0);

        return {
          sentence,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);

    for (const item of sentences) {
      selected.push({
        sentence: item.sentence,
        sourceIndex,
        path: result.chunk.relativePath,
      });
    }
  }

  return selected.slice(0, 6);
}

function composeEvidenceAnswer(question: string, results: VaultBrainSearchResult[]) {
  const evidence = selectEvidenceSentences(question, results);

  if (evidence.length === 0) {
    return "I found related vault sources, but not enough direct evidence to answer confidently.";
  }

  const sourceLines = evidence.map((item) => {
    return `- ${trimSnippet(item.sentence, 260)} [Source ${item.sourceIndex + 1}]`;
  });

  return [
    "Based on the indexed vault sources, the relevant evidence is:",
    "",
    ...sourceLines,
    "",
    "This answer is intentionally source-grounded. Claims not supported by the listed snippets should not be treated as vault knowledge yet.",
  ].join("\n");
}

export async function answerFromVault(question: string): Promise<VaultBrainAnswer> {
  const results = await searchVaultBrain(question, 5);
  const confidence = calculateConfidence(results);
  const unsupported = confidence === "none";

  if (unsupported) {
    return {
      question,
      confidence,
      unsupported: true,
      sources: [],
      answer: [
        "I don't know from the vault yet.",
        "",
        "No indexed vault sources matched the question strongly enough.",
        "",
        "Try:",
        "- index vault brain",
        "- add or approve more vault notes related to this topic",
        "- ask with more specific project names or keywords",
      ].join("\n"),
    };
  }

  return {
    question,
    confidence,
    unsupported: confidence === "low",
    sources: results,
    answer: composeEvidenceAnswer(question, results),
  };
}

export function formatVaultBrainAnswer(answer: VaultBrainAnswer) {
  const sources =
    answer.sources.length > 0
      ? answer.sources.map((result, index) => {
          return [
            `Source ${index + 1}: ${result.chunk.title}`,
            `- Path: ${result.chunk.relativePath}`,
            `- Chunk: ${result.chunk.chunkIndex}`,
            `- Score: ${result.score}`,
            `- Matched: ${result.matchedTerms.join(", ")}`,
          ].join("\n");
        })
      : ["No supporting sources."];

  return [
    `Question: ${answer.question}`,
    `Confidence: ${answer.confidence}`,
    `Unsupported: ${answer.unsupported ? "yes" : "no"}`,
    "",
    "Answer:",
    answer.answer,
    "",
    "Sources:",
    ...sources,
  ].join("\n");
}
