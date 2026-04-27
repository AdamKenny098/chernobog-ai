// lib/chernobog/execution/demoTasks.ts

import { createExecutionTask } from "./createExecutionTask";

export function createFindAndReadFileTask(input: string, target: string) {
  return createExecutionTask({
    input,
    goal: `Find and read ${target}`,
    steps: [
      {
        kind: "file",
        label: `Search for ${target}`,
        action: "find_files",
        input: {
          query: target,
        },
        risk: "safe",
      },
      {
        kind: "file",
        label: "Read selected file",
        action: "read_text_file",
        input: {
          source: "first_search_result",
        },
        risk: "safe",
      },
      {
        kind: "model",
        label: "Summarize file contents",
        action: "model.summarize",
        input: {
          source: "last_read_file",
        },
        risk: "safe",
      },
    ],
  });
}