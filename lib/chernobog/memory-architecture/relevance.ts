const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "to",
    "for",
    "of",
    "in",
    "on",
    "with",
    "about",
    "what",
    "how",
    "why",
    "is",
    "are",
    "was",
    "were",
    "me",
    "my",
    "i",
    "you",
    "we",
    "it",
    "that",
    "this",
  ]);
  
  function tokenize(value: string): string[] {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9_\-\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)
      .filter((token) => !STOP_WORDS.has(token));
  }
  
  function scoreMemoryAgainstQuery(memory: string, query: string): number {
    const memoryTokens = new Set(tokenize(memory));
    const queryTokens = tokenize(query);
  
    if (queryTokens.length === 0 || memoryTokens.size === 0) {
      return 0;
    }
  
    let score = 0;
  
    for (const token of queryTokens) {
      if (memoryTokens.has(token)) {
        score += 2;
      }
  
      for (const memoryToken of memoryTokens) {
        if (
          memoryToken.includes(token) ||
          token.includes(memoryToken)
        ) {
          score += 0.5;
        }
      }
    }
  
    return score;
  }
  
  export function selectRelevantLongTermMemories(
    memories: string[],
    query: string,
    limit = 8
  ): string[] {
    const scored = memories
      .map((memory) => ({
        memory,
        score: scoreMemoryAgainstQuery(memory, query),
      }))
      .sort((a, b) => b.score - a.score);
  
    const relevant = scored.filter((item) => item.score > 0);
  
    if (relevant.length === 0) {
      return memories.slice(0, Math.min(3, limit));
    }
  
    return relevant.slice(0, limit).map((item) => item.memory);
  }