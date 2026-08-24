import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ProjectGitState {
  repository: boolean;

  repositoryRoot?: string;

  branch?: string;
  detached: boolean;

  head?: string;
  upstream?: string;

  ahead: number;
  behind: number;

  dirty: boolean;

  stagedChanges: number;
  unstagedChanges: number;
  untrackedFiles: number;
  conflicts: number;

  observedAt: string;
}

function emptyGitState(): ProjectGitState {
  return {
    repository: false,

    detached: false,

    ahead: 0,
    behind: 0,

    dirty: false,

    stagedChanges: 0,
    unstagedChanges: 0,
    untrackedFiles: 0,
    conflicts: 0,

    observedAt:
      new Date().toISOString(),
  };
}

function parseBranchAb(
  value: string
): {
  ahead: number;
  behind: number;
} {
  const match =
    value.match(
      /^\+(\d+)\s+-(\d+)$/
    );

  if (!match) {
    return {
      ahead: 0,
      behind: 0,
    };
  }

  return {
    ahead:
      Number(match[1]),

    behind:
      Number(match[2]),
  };
}

export function parseGitStatusPorcelainV2(
  output: string,
  repositoryRoot?: string
): ProjectGitState {
  let branch:
    | string
    | undefined;

  let detached =
    false;

  let head:
    | string
    | undefined;

  let upstream:
    | string
    | undefined;

  let ahead = 0;
  let behind = 0;

  let stagedChanges = 0;
  let unstagedChanges = 0;
  let untrackedFiles = 0;
  let conflicts = 0;

  const lines =
    output.split(/\r?\n/);

  for (const line of lines) {
    if (
      line.startsWith(
        "# branch.oid "
      )
    ) {
      const value =
        line.slice(
          "# branch.oid ".length
        ).trim();

      if (
        value &&
        value !== "(initial)"
      ) {
        head = value;
      }

      continue;
    }

    if (
      line.startsWith(
        "# branch.head "
      )
    ) {
      const value =
        line.slice(
          "# branch.head ".length
        ).trim();

      if (
        value === "(detached)"
      ) {
        detached = true;
      } else if (value) {
        branch = value;
      }

      continue;
    }

    if (
      line.startsWith(
        "# branch.upstream "
      )
    ) {
      upstream =
        line.slice(
          "# branch.upstream ".length
        ).trim() ||
        undefined;

      continue;
    }

    if (
      line.startsWith(
        "# branch.ab "
      )
    ) {
      const value =
        line.slice(
          "# branch.ab ".length
        ).trim();

      const parsed =
        parseBranchAb(value);

      ahead =
        parsed.ahead;

      behind =
        parsed.behind;

      continue;
    }

    /*
     * Porcelain v2 tracked entries:
     *
     * 1 XY ...
     * 2 XY ...
     *
     * X = index/staged state
     * Y = working-tree state
     */
    if (
      line.startsWith("1 ") ||
      line.startsWith("2 ")
    ) {
      const fields =
        line.split(" ");

      const xy =
        fields[1] ?? "..";

      if (
        xy[0] &&
        xy[0] !== "."
      ) {
        stagedChanges += 1;
      }

      if (
        xy[1] &&
        xy[1] !== "."
      ) {
        unstagedChanges += 1;
      }

      continue;
    }

    /*
     * Unmerged entry.
     */
    if (
      line.startsWith("u ")
    ) {
      conflicts += 1;

      /*
       * Treat conflicts as both staged and
       * unstaged project work for state purposes.
       */
      stagedChanges += 1;
      unstagedChanges += 1;

      continue;
    }

    if (
      line.startsWith("? ")
    ) {
      untrackedFiles += 1;
    }
  }

  const dirty =
    stagedChanges > 0 ||
    unstagedChanges > 0 ||
    untrackedFiles > 0 ||
    conflicts > 0;

  return {
    repository: true,

    repositoryRoot,

    branch,
    detached,

    head,
    upstream,

    ahead,
    behind,

    dirty,

    stagedChanges,
    unstagedChanges,
    untrackedFiles,
    conflicts,

    observedAt:
      new Date().toISOString(),
  };
}

export async function observeProjectGitState(
  cwd = process.cwd()
): Promise<ProjectGitState> {
  try {
    const rootResult =
      await execFileAsync(
        "git",
        [
          "rev-parse",
          "--show-toplevel",
        ],
        {
          cwd,
          windowsHide: true,
          maxBuffer:
            1024 * 1024,
        }
      );

    const repositoryRoot =
      rootResult.stdout.trim();

    const statusResult =
      await execFileAsync(
        "git",
        [
          "status",
          "--porcelain=v2",
          "--branch",
          "--untracked-files=normal",
        ],
        {
          cwd:
            repositoryRoot,

          windowsHide:
            true,

          maxBuffer:
            4 * 1024 * 1024,
        }
      );

    return parseGitStatusPorcelainV2(
      statusResult.stdout,
      repositoryRoot
    );
  } catch {
    return emptyGitState();
  }
}