import { z } from "zod";
import { ToolDefinition } from "../types";

const getTimeInputSchema = z.object({}).strict();

type GetTimeInput = z.infer<typeof getTimeInputSchema>;

type GetTimeOutput = {
  iso: string;
  local: string;
  timezone: string;
  unixMs: number;
};

export const getTimeTool: ToolDefinition<GetTimeInput, GetTimeOutput> = {
  name: "get_time",
  description: "Get the current local system time",
  inputSchema: getTimeInputSchema,
  execute: () => {
    const now = new Date();

    return {
      iso: now.toISOString(),
      local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      unixMs: now.getTime(),
    };
  },
};