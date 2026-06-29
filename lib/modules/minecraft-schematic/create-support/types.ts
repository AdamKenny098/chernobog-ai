export type CreateAxis = "x" | "y" | "z";
export type CreateHorizontalFacing = "north" | "south" | "east" | "west";
export type CreateFacing = CreateHorizontalFacing | "up" | "down";

export type CreateNodeKind =
  | "power_source"
  | "shaft"
  | "cogwheel"
  | "large_cogwheel"
  | "gearbox"
  | "belt"
  | "depot"
  | "chute"
  | "funnel"
  | "mechanical_press"
  | "mechanical_mixer"
  | "basin"
  | "water_wheel"
  | "trackside_foundation"
  | "decorative";

export type CreateConnectionKind =
  | "shaft"
  | "cog_mesh"
  | "gearbox"
  | "belt"
  | "machine_input"
  | "machine_output"
  | "item_flow"
  | "decorative";

export type CreateMachinePurpose =
  | "press_line"
  | "mixer_station"
  | "water_wheel_power"
  | "factory_yard"
  | "train_platform_detail"
  | "decorative";

export type CreateValidationSeverity = "info" | "warning" | "error";

export type CreateMechanicalStatus = "passed" | "warnings" | "failed";

export type CreateVector3 = {
  x: number;
  y: number;
  z: number;
};

export type CreateBlockStateProperties = Record<string, string | number | boolean>;

export type CreateBlockPlacement = {
  id: string;
  blockId: string;
  position: CreateVector3;
  properties?: CreateBlockStateProperties;
  role?: string;
  note?: string;
};

export type CreateMechanicalNode = {
  id: string;
  kind: CreateNodeKind;
  position: CreateVector3;
  axis?: CreateAxis;
  facing?: CreateFacing;
  blockId?: string;
  decorative?: boolean;
  required?: boolean;
  role?: string;
  notes?: string[];
};

export type CreateMechanicalConnection = {
  id: string;
  kind: CreateConnectionKind;
  from: string;
  to: string;
  axis?: CreateAxis;
  decorative?: boolean;
  notes?: string[];
};

export type CreateMechanicalGraph = {
  id: string;
  purpose: CreateMachinePurpose;
  profileId: string;
  nodes: CreateMechanicalNode[];
  connections: CreateMechanicalConnection[];
  flowHints: string[];
  blockPlacements?: CreateBlockPlacement[];
  notes?: string[];
};

export type CreateValidationIssue = {
  code: string;
  severity: CreateValidationSeverity;
  message: string;
  target?: string;
  repairHint?: string;
};

export type CreateMechanicalValidationResult = {
  kind: "create_mechanical_validation";
  graphId: string;
  status: CreateMechanicalStatus;
  summary: {
    nodes: number;
    connections: number;
    errors: number;
    warnings: number;
    info: number;
  };
  issues: CreateValidationIssue[];
};

export type CreateSupportProfile = {
  id: string;
  label: string;
  supportsCreate: boolean;
  createVersionHint?: string;
  minecraftVersionHint?: string;
  modLoaderHint?: "forge" | "neoforge" | "fabric" | "unknown";
  allowedBlockIds: string[];
  notes: string[];
};

export type CreateMachinePreset = "press_line" | "mixer_station" | "water_wheel_power";

export type CreateGraphFactoryOptions = {
  id?: string;
  profileId?: string;
  origin?: CreateVector3;
  decorative?: boolean;
};
