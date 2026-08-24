// lib/chernobog/tools/builtins/run-project-command.ts

import { spawn } from "node:child_process";

import { z } from "zod";

import { publishChernobogEventSafely } from "../../events/publishers";
import { ToolDefinition } from "../types";

const runProjectCommandInputSchema = z.object({
  command: z.enum(["typecheck"]),
});

type RunProjectCommandInput =
  z.infer<typeof runProjectCommandInputSchema>;

type RunProjectCommandOutput = {
  success: boolean;
  command: string;
  exitCode: number | null;
  output: string;
  message: string;
};

function resolveCommand(
  command: RunProjectCommandInput["command"]
) {
  switch (command) {
    case "typecheck":
      return {
        executable: "npx",
        args: [
          "tsc",
          "--noEmit",
        ],
        label:
          "npx tsc --noEmit",
      };
  }
}

export const runProjectCommandTool: ToolDefinition<
  RunProjectCommandInput,
  RunProjectCommandOutput
> = {
  name:
    "run_project_command",

  description:
    "Run an approved project validation command",

  inputSchema:
    runProjectCommandInputSchema,

  execute: async (input) => {
    const resolved =
      resolveCommand(input.command);

    const startedAt =
      Date.now();

    await publishChernobogEventSafely({
      type:
        "project.validation_started",

      source: {
        subsystem:
          "project-operations",
      },

      severity:
        "info",

      subject:
        input.command,

      payload: {
        validation:
          input.command,

        command:
          resolved.label,
      },

      metadata: {
        tags: [
          "project",
          "validation",
          input.command,
        ],
      },
    });

    return new Promise(
      (resolve, reject) => {
        const child = spawn(
          resolved.executable,
          resolved.args,
          {
            cwd:
              process.cwd(),

            shell:
              process.platform ===
              "win32",
          }
        );

        let output = "";

        child.stdout.on(
          "data",
          (chunk) => {
            output +=
              chunk.toString();
          }
        );

        child.stderr.on(
          "data",
          (chunk) => {
            output +=
              chunk.toString();
          }
        );

        child.on(
          "error",
          async (error) => {
            await publishChernobogEventSafely({
              type:
                "project.validation_failed",

              source: {
                subsystem:
                  "project-operations",
              },

              severity:
                "warning",

              subject:
                input.command,

              payload: {
                validation:
                  input.command,

                command:
                  resolved.label,

                durationMs:
                  Date.now() -
                  startedAt,

                exitCode:
                  null,

                failureKind:
                  "process-error",

                error:
                  error.message,
              },

              metadata: {
                tags: [
                  "project",
                  "validation",
                  input.command,
                  "failure",
                ],

                sensitive:
                  true,
              },
            });

            reject(error);
          }
        );

        child.on(
          "close",
          async (exitCode) => {
            const success =
              exitCode === 0;

            await publishChernobogEventSafely({
              type:
                success
                  ? "project.validation_completed"
                  : "project.validation_failed",

              source: {
                subsystem:
                  "project-operations",
              },

              severity:
                success
                  ? "info"
                  : "warning",

              subject:
                input.command,

              payload: {
                validation:
                  input.command,

                command:
                  resolved.label,

                durationMs:
                  Date.now() -
                  startedAt,

                exitCode,

                failureKind:
                  success
                    ? undefined
                    : "non-zero-exit",
              },

              metadata: {
                tags: [
                  "project",
                  "validation",
                  input.command,

                  success
                    ? "success"
                    : "failure",
                ],
              },
            });

            resolve({
              success,

              command:
                resolved.label,

              exitCode,

              output:
                output.trim(),

              message:
                success
                  ? `Project command passed: ${resolved.label}`
                  : `Project command failed: ${resolved.label}`,
            });
          }
        );
      }
    );
  },
};