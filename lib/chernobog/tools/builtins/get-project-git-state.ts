import path from "node:path";

import { z } from "zod";

import { publishChernobogEventSafely } from "../../events/publishers";
import { observeProjectGitState } from "../../project/gitState";
import { ToolDefinition } from "../types";

const getProjectGitStateInputSchema = z.object({
  path: z.string().min(1).optional(),
});

type GetProjectGitStateInput =
  z.infer<typeof getProjectGitStateInputSchema>;

function buildStateKey(args: {
  repositoryName: string;
  branch?: string;
  detached: boolean;
  dirty: boolean;
  ahead: number;
  behind: number;
  stagedChanges: number;
  unstagedChanges: number;
  untrackedFiles: number;
  conflicts: number;
}): string {
  return [
    args.repositoryName,
    args.branch ?? "detached",
    args.detached ? "detached" : "attached",
    args.dirty ? "dirty" : "clean",
    `a${args.ahead}`,
    `b${args.behind}`,
    `s${args.stagedChanges}`,
    `u${args.unstagedChanges}`,
    `n${args.untrackedFiles}`,
    `c${args.conflicts}`,
  ].join(":");
}

export const getProjectGitStateTool: ToolDefinition<
  GetProjectGitStateInput,
  Awaited<ReturnType<typeof observeProjectGitState>>
> = {
  name: "get_project_git_state",

  description:
    "Inspect the Git state of a project using read-only Git commands",

  inputSchema:
    getProjectGitStateInputSchema,

  execute: async (input) => {
    const cwd =
      input.path ?? process.cwd();

    const state =
      await observeProjectGitState(cwd);

    if (!state.repository) {
      await publishChernobogEventSafely({
        type: "project.git_unavailable",

        source: {
          subsystem: "project-operations",
        },

        severity: "notice",

        subject: "git",

        payload: {
          repository: false,
        },

        dedupeKey:
          `project.git_unavailable:${cwd}`,

        metadata: {
          tags: [
            "project",
            "git",
            "unavailable",
          ],
        },
      });

      return state;
    }

    const repositoryName =
      state.repositoryRoot
        ? path.basename(
            state.repositoryRoot
          )
        : "repository";

    const shortHead =
      state.head?.slice(0, 12);

    const stateKey =
      buildStateKey({
        repositoryName,
        branch: state.branch,
        detached: state.detached,
        dirty: state.dirty,
        ahead: state.ahead,
        behind: state.behind,
        stagedChanges:
          state.stagedChanges,
        unstagedChanges:
          state.unstagedChanges,
        untrackedFiles:
          state.untrackedFiles,
        conflicts:
          state.conflicts,
      });

    const payload = {
      repository: true,
      repositoryName,

      branch:
        state.branch,

      detached:
        state.detached,

      head:
        shortHead,

      upstream:
        state.upstream,

      ahead:
        state.ahead,

      behind:
        state.behind,

      dirty:
        state.dirty,

      stagedChanges:
        state.stagedChanges,

      unstagedChanges:
        state.unstagedChanges,

      untrackedFiles:
        state.untrackedFiles,

      conflicts:
        state.conflicts,
    };

    await publishChernobogEventSafely({
      type:
        "project.git_observed",

      source: {
        subsystem:
          "project-operations",
      },

      severity:
        "debug",

      subject:
        repositoryName,

      scope:
        `project:${repositoryName}`,

      payload,

      dedupeKey:
        `project.git_observed:${stateKey}`,

      metadata: {
        tags: [
          "project",
          "git",
          "observed",
        ],
      },
    });

    await publishChernobogEventSafely({
      type:
        state.dirty
          ? "project.git_dirty"
          : "project.git_clean",

      source: {
        subsystem:
          "project-operations",
      },

      severity:
        state.dirty
          ? "notice"
          : "info",

      subject:
        repositoryName,

      scope:
        `project:${repositoryName}`,

      payload,

      dedupeKey:
        `project.git_state:${stateKey}`,

      metadata: {
        tags: [
          "project",
          "git",

          state.dirty
            ? "dirty"
            : "clean",
        ],
      },
    });

    return state;
  },
};