export type MinecraftSchematicCommand =
  | {
      kind: "status";
      raw: string;
    }
  | {
      kind: "help";
      raw: string;
    }
  | {
      kind: "generate-tower";
      raw: string;
    }
  | {
      kind: "unknown";
      raw: string;
      reason: string;
    };

export type MinecraftSchematicCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: unknown;
};