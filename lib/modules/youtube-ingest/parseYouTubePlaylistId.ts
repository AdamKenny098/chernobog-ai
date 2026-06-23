function cleanInput(input: string) {
    return input.trim().replace(/^["']|["']$/g, "");
  }
  
  export function parseYouTubePlaylistId(input: string): string {
    const cleaned = cleanInput(input);
  
    if (!cleaned) {
      throw new Error("Missing YouTube playlist URL or playlist ID.");
    }
  
    try {
      const url = new URL(cleaned);
      const listId = url.searchParams.get("list");
  
      if (listId) {
        return listId.trim();
      }
    } catch {
      // Not a URL. Treat as raw playlist ID below.
    }
  
    const rawIdPattern = /^[a-zA-Z0-9_-]{10,}$/;
  
    if (!rawIdPattern.test(cleaned)) {
      throw new Error(
        "Invalid YouTube playlist input. Provide a playlist URL containing ?list=... or a raw playlist ID."
      );
    }
  
    return cleaned;
  }