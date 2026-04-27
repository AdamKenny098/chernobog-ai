// lib/chernobog/execution/demoRun.ts

import { buildExecutionTaskFromMessage } from "./buildExecutionTask";
import { formatExecutionResponse } from "./formatExecutionResponse";
import { runExecutionTask } from "./runExecutionTask";
import { createToolExecutionHandlers } from "./toolExecutionHandlers";

export async function runDemoExecutionTask() {
  const task = buildExecutionTaskFromMessage("Find the roadmap and read it");

  if (!task) {
    throw new Error("Could not build execution task from demo message.");
  }

  return runExecutionTask(task, {
    handlers: createToolExecutionHandlers({
      inputMappers: {
        read_text_file(_input, context) {
          return {
            path: context.selectedFilePath,
          };
        },

        open_file(_input, context) {
          return {
            path: context.selectedFilePath,
          };
        },

        open_folder(_input, context) {
          return {
            path: context.selectedFolderPath ?? context.selectedFilePath,
          };
        },
      },
    }),
  });
}

export async function runDemoExecutionResponse() {
  const task = await runDemoExecutionTask();
  return formatExecutionResponse(task);
}