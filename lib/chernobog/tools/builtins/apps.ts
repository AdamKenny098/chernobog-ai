import { spawn } from "node:child_process";
import { z } from "zod";
import { ToolDefinition } from "../types";

const openAppInputSchema = z.object({
  appName: z.string().min(1),
});

type OpenAppInput = z.infer<typeof openAppInputSchema>;

type OpenAppOutput = {
  success: boolean;
  appName: string;
  resolvedApp: string;
  message: string;
};

const APP_ALIASES: Record<string, string> = {
    spotify: "spotify",
    discord: "discord",
    opera: "opera",
    "opera gx": "opera",
    operagx: "opera",
    browser: "opera",
    "my browser": "opera",
    "web browser": "opera",
    "default browser": "opera",
    chrome: "chrome",
    "google chrome": "chrome",
    firefox: "firefox",
    edge: "msedge",
    "microsoft edge": "msedge",
    vscode: "code",
    "vs code": "code",
    "visual studio code": "code",
    notepad: "notepad",
    calc: "calc",
    calculator: "calc",
  };

function normalizeAppName(appName: string) {
  return appName.trim().toLowerCase();
}

function openWindowsApp(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("cmd", ["/c", "start", "", command], {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", reject);
    child.unref();
    resolve();
  });
}

function openMacApp(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("open", ["-a", command], {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", reject);
    child.unref();
    resolve();
  });
}

function openLinuxApp(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [], {
      detached: true,
      stdio: "ignore",
    });

    child.on("error", reject);
    child.unref();
    resolve();
  });
}

export const openAppTool: ToolDefinition<OpenAppInput, OpenAppOutput> = {
  name: "open_app",
  description: "Open a whitelisted application by alias",
  inputSchema: openAppInputSchema,
  execute: async (input, context) => {
    const normalized = normalizeAppName(input.appName);
    const resolvedApp = APP_ALIASES[normalized];

    if (!resolvedApp) {
      throw new Error(`App is not allowed or not mapped: ${input.appName}`);
    }

    const platform = context?.platform ?? process.platform;

    if (platform === "win32") {
      await openWindowsApp(resolvedApp);
    } else if (platform === "darwin") {
      await openMacApp(resolvedApp);
    } else if (platform === "linux") {
      await openLinuxApp(resolvedApp);
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    return {
      success: true,
      appName: input.appName,
      resolvedApp,
      message: `Opened ${input.appName}`,
    };
  },
};