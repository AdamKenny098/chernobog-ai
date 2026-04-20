import { spawn } from "node:child_process";
import { z } from "zod";
import { ToolDefinition } from "../types";

const openUrlInputSchema = z.object({
  url: z.string().url(),
});

type OpenUrlInput = z.infer<typeof openUrlInputSchema>;

type OpenUrlOutput = {
  success: boolean;
  url: string;
  message: string;
};

function assertSafeUrl(rawUrl: string): URL {
  const parsed = new URL(rawUrl);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are allowed");
  }

  return parsed;
}

function openOnWindows(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("cmd", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", reject);
    child.unref();
    resolve();
  });
}

function openOnMac(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("open", [url], {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", reject);
    child.unref();
    resolve();
  });
}

function openOnLinux(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("xdg-open", [url], {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", reject);
    child.unref();
    resolve();
  });
}

export const openUrlTool: ToolDefinition<OpenUrlInput, OpenUrlOutput> = {
  name: "open_url",
  description: "Open a safe URL in the system browser",
  inputSchema: openUrlInputSchema,
  execute: async (input, context) => {
    const parsed = assertSafeUrl(input.url);
    const platform = context?.platform ?? process.platform;

    if (platform === "win32") {
      await openOnWindows(parsed.toString());
    } else if (platform === "darwin") {
      await openOnMac(parsed.toString());
    } else if (platform === "linux") {
      await openOnLinux(parsed.toString());
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    return {
      success: true,
      url: parsed.toString(),
      message: `Opened ${parsed.toString()}`,
    };
  },
};