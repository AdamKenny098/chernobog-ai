// lib/chernobog/tools/builtins/run-project-command.ts

import { spawn } from "node:child_process";
import { z } from "zod";
import { ToolDefinition } from "../types";

const runProjectCommandInputSchema = z.object({
  command: z.enum(["typecheck"]),
});

type RunProjectCommandInput = z.infer<typeof runProjectCommandInputSchema>;

type RunProjectCommandOutput = {
  success: boolean;
  command: string;
  exitCode: number | null;
  output: string;
  message: string;
};

function resolveCommand(command: RunProjectCommandInput["command"]) {
  switch (command) {
    case "typecheck":
      return {
        executable: "npx",
        args: ["tsc", "--noEmit"],
        label: "npx tsc --noEmit",
      };
  }
}

export const runProjectCommandTool: ToolDefinition<
  RunProjectCommandInput,
  RunProjectCommandOutput
> = {
  name: "run_project_command",
  description: "Run an approved project validation command",
  inputSchema: runProjectCommandInputSchema,
  execute: async (input) => {
    const resolved = resolveCommand(input.command);

    return new Promise((resolve, reject) => {
      const child = spawn(resolved.executable, resolved.args, {
        cwd: process.cwd(),
        shell: process.platform === "win32",
      });

      let output = "";

      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        output += chunk.toString();
      });

      child.on("error", reject);

      child.on("close", (exitCode) => {
        resolve({
          success: exitCode === 0,
          command: resolved.label,
          exitCode,
          output: output.trim(),
          message:
            exitCode === 0
              ? `Project command passed: ${resolved.label}`
              : `Project command failed: ${resolved.label}`,
        });
      });
    });
  },
};