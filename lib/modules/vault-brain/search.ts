import {
  readVaultBrainChunks,
  readVaultBrainDocuments,
} from "./store";
import {
  VaultBrainChunk,
  VaultBrainDocument,
  VaultBrainSearchResult,
} from "./types";
import {
  countOccurrences,
  tokenize,
  trimSnippet,
} from "./text";

function scoreChunk(chunk: VaultBrainChunk, document: VaultBrainDocument | undefined, terms: string[]) {
  const text = chunk.text.toLowerCase();
  const title = chunk.title.toLowerCase();
  const filePath = chunk.relativePath.toLowerCase();
  const keywords = chunk.keywords.map((keyword) => keyword.toLowerCase());

  let score = 0;
  const matchedTerms: string[] = [];

  for (const term of terms) {
    let termScore = 0;

    termScore += countOccurrences(text, term);
    termScore += title.includes(term) ? 5 : 0;
    termScore += filePath.includes(term) ? 3 : 0;
    termScore += keywords.includes(term) ? 3 : 0;

    if (document?.title.toLowerCase().includes(term)) {
      termScore += 2;
    }

    if (termScore > 0) {
      matchedTerms.push(term);
      score += termScore;
    }
  }

  if (matchedTerms.length > 1) {
    score += matchedTerms.length * 2;
  }

  return {
    score,
    matchedTerms,
  };
}

export async function searchVaultBrain(query: string, limit = 8): Promise<VaultBrainSearchResult[]> {
  const terms = tokenize(query);

  if (terms.length === 0) {
    return [];
  }

  const [chunks, documents] = await Promise.all([
    readVaultBrainChunks(),
    readVaultBrainDocuments(),
  ]);

  const documentById = new Map(documents.map((document) => [document.id, document]));

  return chunks
    .map((chunk) => {
      const document = documentById.get(chunk.documentId);
      const scored = scoreChunk(chunk, document, terms);

      return {
        chunk,
        document,
        score: scored.score,
        matchedTerms: scored.matchedTerms,
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatVaultBrainSearchResults(query: string, results: VaultBrainSearchResult[]) {
  if (results.length === 0) {
    return [
      `Query: ${query}`,
      "",
      "No matching vault brain chunks were found.",
      "",
      "Try:",
      "- index vault brain",
      "- use more specific project names or file terms",
    ].join("\n");
  }

  return [
    `Query: ${query}`,
    `Results: ${results.length}`,
    "",
    ...results.flatMap((result, index) => [
      `${index + 1}. ${result.chunk.title}`,
      `   Path: ${result.chunk.relativePath}`,
      `   Chunk: ${result.chunk.chunkIndex}`,
      `   Score: ${result.score}`,
      `   Matched: ${result.matchedTerms.join(", ")}`,
      `   Snippet: ${trimSnippet(result.chunk.text)}`,
      "",
    ]),
  ].join("\n");
}
