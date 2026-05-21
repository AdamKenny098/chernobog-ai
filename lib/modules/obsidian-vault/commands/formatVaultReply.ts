import type { ToolResult } from "@/lib/chernobog/tools/types";

type AnyToolResult = ToolResult<unknown>;

export function formatVaultReply(result: AnyToolResult): string {
  if (!result.ok) {
    return `Vault tool failed: ${result.error}`;
  }

  switch (result.tool) {
    case "vault_search": {
      const data = result.data as {
        query: string;
        resultCount: number;
        results: { title: string; relativePath: string; score: number }[];
      };

      if (data.resultCount === 0) {
        return `No vault notes matched "${data.query}".`;
      }

      const preview = data.results
        .slice(0, 8)
        .map(
          (note, index) =>
            `${index + 1}. ${note.title} — ${note.relativePath} (score ${note.score})`
        )
        .join("\n");

      return `Found ${data.resultCount} vault note(s) matching "${data.query}":\n${preview}`;
    }

    case "vault_read_note": {
      const data = result.data as {
        title: string;
        relativePath: string;
        content: string;
        truncated: boolean;
      };

      return data.truncated
        ? `Read vault note: ${data.title} — ${data.relativePath}\n\n${data.content}\n\n[truncated]`
        : `Read vault note: ${data.title} — ${data.relativePath}\n\n${data.content}`;
    }

    case "vault_create_note": {
      const data = result.data as {
        title: string;
        relativePath: string;
        created: boolean;
        overwritten: boolean;
      };

      if (data.overwritten) {
        return `Updated vault note: ${data.title} — ${data.relativePath}`;
      }

      return data.created
        ? `Created vault note: ${data.title} — ${data.relativePath}`
        : `Vault note available: ${data.title} — ${data.relativePath}`;
    }

    case "vault_append_note": {
      const data = result.data as {
        title: string;
        relativePath: string;
        appendedChars: number;
      };

      return `Appended ${data.appendedChars} character(s) to vault note: ${data.title} — ${data.relativePath}`;
    }

    case "vault_link_notes": {
      const data = result.data as {
        fromTitle: string;
        fromRelativePath: string;
        toTitle: string;
        changed: boolean;
      };

      return data.changed
        ? `Linked ${data.fromTitle} to [[${data.toTitle}]] — ${data.fromRelativePath}`
        : `${data.fromTitle} already links to [[${data.toTitle}]].`;
    }

    case "vault_backlinks": {
      const data = result.data as {
        note: string;
        count: number;
        results: { sourceTitle: string; sourceRelativePath: string }[];
      };

      if (data.count === 0) {
        return `No backlinks found for [[${data.note}]].`;
      }

      const preview = data.results
        .slice(0, 10)
        .map((item, index) => `${index + 1}. ${item.sourceTitle} — ${item.sourceRelativePath}`)
        .join("\n");

      return `Found ${data.count} backlink(s) for [[${data.note}]]:\n${preview}`;
    }

    case "vault_find_orphans": {
      const data = result.data as {
        count: number;
        returnedCount: number;
        results: { title: string; relativePath: string }[];
      };

      if (data.count === 0) {
        return "No orphan vault notes found.";
      }

      const preview = data.results
        .slice(0, 20)
        .map((item, index) => `${index + 1}. ${item.title} — ${item.relativePath}`)
        .join("\n");

      return `Found ${data.count} orphan vault note(s). Showing ${data.returnedCount}:\n${preview}`;
    }

    case "vault_generate_index": {
      const data = result.data as {
        project: string;
        relativePath: string;
        noteCount: number;
      };

      return `Generated ${data.project} project index with ${data.noteCount} source note(s): ${data.relativePath}`;
    }

    case "vault_daily_log": {
      const data = result.data as {
        title: string;
        relativePath: string;
        date: string;
      };

      return `Updated daily vault log for ${data.date}: ${data.title} — ${data.relativePath}`;
    }

    default:
      return "Vault tool executed successfully.";
  }
}
