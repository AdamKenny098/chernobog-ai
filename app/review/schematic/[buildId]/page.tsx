import { promises as fs } from "fs";
import path from "path";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SchematicLayerViewer } from "./SchematicLayerViewer";
import { SchematicReviewActions } from "./SchematicReviewActions";

type PageProps = {
  params: { buildId: string } | Promise<{ buildId: string }>;
};

type SchematicSize = {
  x: number;
  y: number;
  z: number;
};

type SchematicBlockEntity = {
  id: string;
  kind: string;
  x: number;
  y: number;
  z: number;
  text?: string[];
  label?: string;
  metadata?: Record<string, unknown>;
  nbtId?: string;
  nbtStatus?: "written" | "metadata_only";
  nbtWarnings?: string[];
};

type SchematicBlockEntityExportSummary = {
  total: number;
  signs: number;
  chests: number;
  barrels: number;
  placeholders: number;
  nbtWritten: number;
  metadataOnly: number;
  warnings: string[];
};

type BlockRegistryReport = {
  profileId: "vanilla" | "siriocraft-create";
  profileDisplayName: string;
  allowModdedBlocks: boolean;
  fallbackToVanilla: boolean;
  allowedNamespaces: string[];
  supportedModdedBlocks: string[];
  totalBlocksChecked: number;
  totalPaletteEntriesChecked: number;
  changedBlocks: number;
  fallbackBlocks: number;
  unsupportedBlocks: Array<{ block: string; reason: string }>;
  replacements: Array<{ original: string; replacement: string; reason: string; context: string }>;
  warnings: string[];
};

type ShapeValidationIssueRecord = {
  severity: "error" | "warning";
  category: string;
  message: string;
  x?: number;
  y?: number;
  z?: number;
  blockState?: string;
};

type ShapeValidationReportRecord = {
  valid: boolean;
  blockCount: number;
  nonAirBlockCount: number;
  invalidBlocks: number;
  invalidStates: number;
  unsupportedComplexBlocks: number;
  missingSupport: number;
  malformedMultiBlocks: number;
  warnings: number;
  issues: ShapeValidationIssueRecord[];
};

type ShapeResolverReportRecord = {
  passName: string;
  changed: number;
  warnings: string[];
};


type SchematicBuildReport = {
  title: string;
  status: "passed" | "warning" | "failed";
  sirioCraftUseCase: string;
  suggestedPlacement: string;
  recommendedNextAction: string;
  qualityNotes: string[];
  knownLimitations: string[];
  warningSummary: string[];
  paletteSummary: Array<{ block: string; role: string }>;
  blockEntitySummary: {
    total: number;
    nbtWritten: number;
    metadataOnly: number;
    labels: string[];
  };
  blockRegistrySummary?: {
    profileId: "vanilla" | "siriocraft-create";
    allowModdedBlocks: boolean;
    fallbackToVanilla: boolean;
    changedBlocks: number;
    fallbackBlocks: number;
    unsupportedBlocks: number;
  };
  outputSummary: Array<{
    kind: "schem" | "metadata" | "debug" | "vault-note";
    path: string;
    label: string;
  }>;
  reviewRoute: string;
  tags: string[];
};

type SchematicMetadata = {
  buildId: string;
  displayName?: string;
  generatedAt: string;
  generatorName: string;
  variant: string;
  presetId?: string;
  profile?: string;
  allowModdedBlocks?: boolean;
  fallbackToVanilla?: boolean;
  prompt: string;
  command: string;
  minecraftVersion: string;
  size: SchematicSize;
  palette: string[];
  blockCount: number;
  blockEntities?: SchematicBlockEntity[];
  blockEntityExport?: SchematicBlockEntityExportSummary;
  features?: string[];
  outputPaths: {
    debugJsonPath: string;
    metadataJsonPath: string;
    schemPath: string;
    vaultNotePath: string;
  };
  validation: {
    ok: boolean;
    warnings: string[];
    errors: string[];
  };
  shapeValidation?: ShapeValidationReportRecord;
  shapeResolverReports?: ShapeResolverReportRecord[];
  placementWarnings?: string[];
  unsupportedBlockWarnings?: string[];
  blockRegistryReport?: BlockRegistryReport;
  buildReport?: SchematicBuildReport;
};

type DebugPayload = {
  blocks: Array<{ x: number; y: number; z: number; block: string }>;
  blockEntities?: SchematicBlockEntity[];
  blockEntityExport?: SchematicBlockEntityExportSummary;
};

type FileInfo = {
  kind: "schem" | "metadata" | "debug" | "vault-note";
  label: string;
  relativePath: string;
  absolutePath: string | null;
  exists: boolean;
  sizeBytes: number;
};

const panelStyle = {
  border: "1px solid #2b3340",
  borderRadius: 14,
  padding: 18,
  background: "#0f151d",
} as const;

const mutedStyle = {
  color: "#94a3b8",
} as const;

function safeBuildId(buildId: string): string | null {
  return /^[a-zA-Z0-9_.-]+$/.test(buildId) ? buildId : null;
}

async function readJsonFile<T>(absolutePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toProjectAbsolutePath(root: string, relativePath: string): string | null {
  if (!relativePath || path.isAbsolute(relativePath)) {
    return null;
  }

  const normalized = path.normalize(relativePath);

  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return null;
  }

  return path.join(root, normalized);
}

async function getFileInfo(root: string, kind: FileInfo["kind"], label: string, relativePath: string): Promise<FileInfo> {
  const absolutePath = toProjectAbsolutePath(root, relativePath);

  if (!absolutePath) {
    return {
      kind,
      label,
      relativePath,
      absolutePath: null,
      exists: false,
      sizeBytes: 0,
    };
  }

  try {
    const stat = await fs.stat(absolutePath);

    return {
      kind,
      label,
      relativePath,
      absolutePath,
      exists: stat.isFile(),
      sizeBytes: stat.size,
    };
  } catch {
    return {
      kind,
      label,
      relativePath,
      absolutePath,
      exists: false,
      sizeBytes: 0,
    };
  }
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function statusBadge(ok: boolean, passText = "PASS", failText = "FAIL") {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
        border: `1px solid ${ok ? "#1f6f4a" : "#7f1d1d"}`,
        background: ok ? "#0f2f22" : "#351111",
        color: ok ? "#8ee0b6" : "#fca5a5",
      }}
    >
      {ok ? passText : failText}
    </span>
  );
}

function reportStatusBadge(status: SchematicBuildReport["status"]) {
  const ok = status === "passed";
  const warning = status === "warning";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.4,
        border: `1px solid ${ok ? "#1f6f4a" : warning ? "#854d0e" : "#7f1d1d"}`,
        background: ok ? "#0f2f22" : warning ? "#30220a" : "#351111",
        color: ok ? "#8ee0b6" : warning ? "#facc15" : "#fca5a5",
      }}
    >
      REPORT {status.toUpperCase()}
    </span>
  );
}

function compactRow(label: string, value: string | number | boolean | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  return (
    <div style={{ borderBottom: "1px solid #1f2937", padding: "10px 0" }}>
      <div style={{ ...mutedStyle, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ marginTop: 4, overflowWrap: "anywhere" }}>{String(value)}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={panelStyle}>
      <h2 style={{ marginTop: 0, marginBottom: 14, fontSize: 20 }}>{title}</h2>
      {children}
    </section>
  );
}

function TagList({ values, emptyText }: { values: string[] | undefined; emptyText: string }) {
  if (!values?.length) {
    return <p style={mutedStyle}>{emptyText}</p>;
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {values.map((value) => (
        <span key={value} style={{ border: "1px solid #334155", borderRadius: 999, padding: "6px 10px", background: "#111827" }}>
          {value}
        </span>
      ))}
    </div>
  );
}

function WarningList({ title, values }: { title: string; values: string[] }) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 14 }}>
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <ul style={{ marginTop: 0 }}>
        {values.map((value) => (
          <li key={value} style={{ marginBottom: 6 }}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

function buildBlockCounts(blocks: DebugPayload["blocks"]): Array<{ block: string; count: number }> {
  const counts = new Map<string, number>();

  for (const block of blocks) {
    counts.set(block.block, (counts.get(block.block) ?? 0) + 1);
  }

  return Array.from(counts, ([block, count]) => ({ block, count })).sort((a, b) => b.count - a.count || a.block.localeCompare(b.block));
}

function shapeIssueLabel(issue: ShapeValidationIssueRecord): string {
  const position = issue.x === undefined ? "" : ` @ ${issue.x},${issue.y},${issue.z}`;
  return `[${issue.severity}/${issue.category}]${position} ${issue.message}`;
}

export default async function SchematicReviewPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const buildId = safeBuildId(resolvedParams.buildId);

  if (!buildId) {
    notFound();
  }

  const root = process.cwd();
  const metadataPath = path.join(root, "exports", "schematics", "metadata", `${buildId}.metadata.json`);
  const metadata = await readJsonFile<SchematicMetadata>(metadataPath);

  if (!metadata) {
    notFound();
  }

  const debugPath = toProjectAbsolutePath(root, metadata.outputPaths.debugJsonPath);
  const debug = debugPath ? await readJsonFile<DebugPayload>(debugPath) : null;
  const debugBlocks = debug?.blocks ?? [];
  const blockCounts = buildBlockCounts(debugBlocks);
  const allBlockEntities = metadata.blockEntities?.length ? metadata.blockEntities : debug?.blockEntities ?? [];

  const outputFiles = await Promise.all([
    getFileInfo(root, "schem", "Schematic", metadata.outputPaths.schemPath),
    getFileInfo(root, "metadata", "Metadata JSON", metadata.outputPaths.metadataJsonPath),
    getFileInfo(root, "debug", "Debug JSON", metadata.outputPaths.debugJsonPath),
    getFileInfo(root, "vault-note", "Vault Note", metadata.outputPaths.vaultNotePath),
  ]);
  const outputFolderPath = toProjectAbsolutePath(root, path.dirname(metadata.outputPaths.schemPath)) ?? path.join(root, "exports", "schematics");
  const reviewRoute = `/review/schematic/${metadata.buildId}`;
  const buildReport = metadata.buildReport;
  const blockRegistryReport = metadata.blockRegistryReport;

  const validationWarnings = metadata.validation.warnings ?? [];
  const placementWarnings = metadata.placementWarnings ?? [];
  const unsupportedBlockWarnings = metadata.unsupportedBlockWarnings ?? [];
  const shapeWarningIssues = metadata.shapeValidation?.issues.filter((issue) => issue.severity === "warning") ?? [];
  const shapeErrorIssues = metadata.shapeValidation?.issues.filter((issue) => issue.severity === "error") ?? [];
  const totalWarnings = validationWarnings.length + placementWarnings.length + unsupportedBlockWarnings.length + shapeWarningIssues.length;
  const totalErrors = (metadata.validation.errors ?? []).length + shapeErrorIssues.length;

  return (
    <main style={{ color: "#d8dee9", background: "#070b10", minHeight: "100vh", padding: "30px 22px" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <header style={{ display: "flex", gap: 16, justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <p style={{ letterSpacing: 2, textTransform: "uppercase", color: "#8f9bad", marginBottom: 8 }}>Chernobog Schematic Review</p>
            <h1 style={{ margin: 0, fontSize: 34 }}>{metadata.displayName ?? metadata.buildId}</h1>
            <p style={{ ...mutedStyle, marginTop: 8, maxWidth: 900 }}>{metadata.prompt}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {statusBadge(metadata.validation.ok && (metadata.shapeValidation?.valid ?? true), "VALID", "CHECK")}
            {buildReport ? reportStatusBadge(buildReport.status) : null}
            <span style={{ border: "1px solid #334155", borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>{metadata.generatorName}</span>
            <span style={{ border: "1px solid #334155", borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>{metadata.variant}</span>
          </div>
        </header>

        <div style={{ marginBottom: 22 }}>
          <SchematicReviewActions
            buildId={metadata.buildId}
            reviewRoute={reviewRoute}
            outputFolderPath={outputFolderPath}
            files={outputFiles.map((file) => ({
              kind: file.kind,
              label: file.label,
              exists: file.exists,
              relativePath: file.relativePath,
              sizeBytes: file.sizeBytes,
            }))}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 22 }}>
          <div style={panelStyle}>
            <div style={mutedStyle}>Size</div>
            <strong style={{ fontSize: 24 }}>{metadata.size.x} x {metadata.size.y} x {metadata.size.z}</strong>
          </div>
          <div style={panelStyle}>
            <div style={mutedStyle}>Blocks</div>
            <strong style={{ fontSize: 24 }}>{metadata.blockCount}</strong>
          </div>
          <div style={panelStyle}>
            <div style={mutedStyle}>Palette</div>
            <strong style={{ fontSize: 24 }}>{metadata.palette.length}</strong>
          </div>
          <div style={panelStyle}>
            <div style={mutedStyle}>Block Entities</div>
            <strong style={{ fontSize: 24 }}>{allBlockEntities.length}</strong>
          </div>
          <div style={panelStyle}>
            <div style={mutedStyle}>NBT Written</div>
            <strong style={{ fontSize: 24 }}>{metadata.blockEntityExport?.nbtWritten ?? 0}</strong>
          </div>
          <div style={panelStyle}>
            <div style={mutedStyle}>Warnings</div>
            <strong style={{ fontSize: 24 }}>{totalWarnings}</strong>
          </div>
          <div style={panelStyle}>
            <div style={mutedStyle}>Errors</div>
            <strong style={{ fontSize: 24 }}>{totalErrors}</strong>
          </div>
          <div style={panelStyle}>
            <div style={mutedStyle}>Report</div>
            <strong style={{ fontSize: 24 }}>{buildReport?.status ?? "n/a"}</strong>
          </div>
          <div style={panelStyle}>
            <div style={mutedStyle}>Block Registry</div>
            <strong style={{ fontSize: 24 }}>{metadata.blockRegistryReport?.profileId ?? metadata.profile ?? "n/a"}</strong>
          </div>
          <div style={panelStyle}>
            <div style={mutedStyle}>Fallback Blocks</div>
            <strong style={{ fontSize: 24 }}>{metadata.blockRegistryReport?.changedBlocks ?? 0}</strong>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 420px) 1fr", gap: 22, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 22 }}>
            <Section title="Build Summary">
              {compactRow("Build ID", metadata.buildId)}
              {compactRow("Generated", formatDate(metadata.generatedAt))}
              {compactRow("Generator", metadata.generatorName)}
              {compactRow("Variant", metadata.variant)}
              {compactRow("Preset", metadata.presetId)}
              {compactRow("Profile", metadata.profile)}
              {compactRow("Allow Modded Blocks", metadata.allowModdedBlocks)}
              {compactRow("Fallback To Vanilla", metadata.fallbackToVanilla)}
              {compactRow("Minecraft", metadata.minecraftVersion)}
              {compactRow("Command", metadata.command)}
            </Section>

            <Section title="Block Registry">
              {metadata.blockRegistryReport ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {compactRow("Profile", `${metadata.blockRegistryReport.profileDisplayName} (${metadata.blockRegistryReport.profileId})`)}
                  {compactRow("Allowed Namespaces", metadata.blockRegistryReport.allowedNamespaces.join(", "))}
                  {compactRow("Allow Modded Blocks", metadata.blockRegistryReport.allowModdedBlocks)}
                  {compactRow("Fallback To Vanilla", metadata.blockRegistryReport.fallbackToVanilla)}
                  {compactRow("Blocks Checked", metadata.blockRegistryReport.totalBlocksChecked)}
                  {compactRow("Palette Entries Checked", metadata.blockRegistryReport.totalPaletteEntriesChecked)}
                  {compactRow("Fallback Replacements", metadata.blockRegistryReport.changedBlocks)}
                  {compactRow("Unsupported Blocks", metadata.blockRegistryReport.unsupportedBlocks.length)}
                  {metadata.blockRegistryReport.supportedModdedBlocks.length ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ ...mutedStyle, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Supported Modded Blocks</div>
                      <TagList values={metadata.blockRegistryReport.supportedModdedBlocks} emptyText="No modded block allow-list recorded." />
                    </div>
                  ) : null}
                </div>
              ) : (
                <p style={mutedStyle}>No block registry report recorded.</p>
              )}
            </Section>

            {buildReport ? (
              <Section title="SirioCraft Report">
                {compactRow("Use Case", buildReport.sirioCraftUseCase)}
                {compactRow("Suggested Placement", buildReport.suggestedPlacement)}
                {compactRow("Next Action", buildReport.recommendedNextAction)}
                <div style={{ marginTop: 14 }}>
                  <div style={{ ...mutedStyle, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Tags</div>
                  <TagList values={buildReport.tags} emptyText="No report tags recorded." />
                </div>
              </Section>
            ) : null}

            <Section title="Features">
              <TagList values={metadata.features} emptyText="No feature metadata recorded." />
            </Section>

            <Section title="Output Files">
              <div style={{ display: "grid", gap: 10 }}>
                {outputFiles.map((file) => (
                  <div key={file.label} style={{ border: "1px solid #253044", borderRadius: 10, padding: 12, background: "#0b1118" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <strong>{file.label}</strong>
                      {statusBadge(file.exists, "FOUND", "MISSING")}
                    </div>
                    <code style={{ display: "block", marginTop: 8, color: "#cbd5e1", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{file.relativePath}</code>
                    <div style={{ ...mutedStyle, marginTop: 6 }}>{formatBytes(file.sizeBytes)}</div>
                  </div>
                ))}
              </div>
              <p style={{ ...mutedStyle, marginBottom: 0 }}>Use the Review Actions panel or <code>schematic open folder latest</code> from Chernobog to open the export directory.</p>
            </Section>
          </div>

          <div style={{ display: "grid", gap: 22, minWidth: 0 }}>
            <Section title="Validation">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                {statusBadge(metadata.validation.ok, "SCHEM PASS", "SCHEM FAIL")}
                {metadata.shapeValidation ? statusBadge(metadata.shapeValidation.valid, "SHAPE PASS", "SHAPE FAIL") : <span style={mutedStyle}>Shape validation unavailable</span>}
              </div>

              <WarningList title="Errors" values={[...(metadata.validation.errors ?? []), ...shapeErrorIssues.map(shapeIssueLabel)]} />
              <WarningList title="Validation Warnings" values={validationWarnings} />
              <WarningList title="Placement Warnings" values={placementWarnings} />
              <WarningList title="Unsupported Block Warnings" values={unsupportedBlockWarnings} />
              <WarningList title="Shape Warnings" values={shapeWarningIssues.map(shapeIssueLabel)} />

              {totalErrors === 0 && totalWarnings === 0 ? <p style={mutedStyle}>No warnings or errors recorded.</p> : null}

              {metadata.shapeResolverReports?.length ? (
                <details style={{ marginTop: 14 }}>
                  <summary>Resolver passes</summary>
                  <ul>
                    {metadata.shapeResolverReports.map((report) => (
                      <li key={report.passName}>
                        <strong>{report.passName}</strong>: changed {report.changed} block(s)
                        {report.warnings.length ? <ul>{report.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </Section>

            {blockRegistryReport && (blockRegistryReport.replacements.length || blockRegistryReport.unsupportedBlocks.length) ? (
              <Section title="Block Registry Decisions">
                {blockRegistryReport.replacements.length ? (
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Fallback Replacements</h3>
                    <div style={{ display: "grid", gap: 8 }}>
                      {blockRegistryReport.replacements.slice(0, 50).map((replacement, index) => (
                        <div key={`${replacement.original}-${replacement.replacement}-${index}`} style={{ border: "1px solid #253044", borderRadius: 10, padding: 10, background: "#0b1118" }}>
                          <code>{replacement.original}</code> → <code>{replacement.replacement}</code>
                          <div style={mutedStyle}>{replacement.context}</div>
                          <div style={mutedStyle}>{replacement.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {blockRegistryReport.unsupportedBlocks.length ? (
                  <div>
                    <h3 style={{ marginTop: 0 }}>Unsupported Blocks</h3>
                    <ul>
                      {blockRegistryReport.unsupportedBlocks.map((entry) => (
                        <li key={`${entry.block}-${entry.reason}`}><code>{entry.block}</code>: {entry.reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Section>
            ) : null}

            {buildReport ? (
              <Section title="Build Report Notes">
                <WarningList title="Quality Notes" values={buildReport.qualityNotes} />
                <WarningList title="Known Limitations" values={buildReport.knownLimitations} />
                <WarningList title="Report Warning Summary" values={buildReport.warningSummary} />
                {!buildReport.qualityNotes.length && !buildReport.knownLimitations.length && !buildReport.warningSummary.length ? (
                  <p style={mutedStyle}>No build report notes recorded.</p>
                ) : null}
              </Section>
            ) : null}

            {debugBlocks.length ? (
              <SchematicLayerViewer size={metadata.size} blocks={debugBlocks} blockEntities={allBlockEntities} />
            ) : (
              <Section title="Layer/debug viewer">
                <p style={mutedStyle}>Debug JSON could not be read or contains no blocks.</p>
              </Section>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22 }}>
              <Section title="Block Palette">
                <div style={{ maxHeight: 420, overflow: "auto", display: "grid", gap: 8 }}>
                  {blockCounts.map(({ block, count }) => (
                    <div key={block} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, borderBottom: "1px solid #1f2937", paddingBottom: 8 }}>
                      <code style={{ overflowWrap: "anywhere" }}>{block}</code>
                      <span style={mutedStyle}>{count}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Block Entities">
                {metadata.blockEntityExport ? (
                  <div style={{ border: "1px solid #253044", borderRadius: 10, padding: 10, marginBottom: 10, background: "#0b1118" }}>
                    <strong>NBT Export Summary</strong>
                    <div style={mutedStyle}>
                      {metadata.blockEntityExport.nbtWritten} written / {metadata.blockEntityExport.metadataOnly} metadata-only / {metadata.blockEntityExport.total} total
                    </div>
                  </div>
                ) : null}
                {buildReport?.blockEntitySummary.labels.length ? (
                  <div style={{ border: "1px solid #253044", borderRadius: 10, padding: 10, marginBottom: 10, background: "#0b1118" }}>
                    <strong>Recorded Labels</strong>
                    <ul style={{ marginBottom: 0 }}>
                      {buildReport.blockEntitySummary.labels.map((label) => <li key={label}>{label}</li>)}
                    </ul>
                  </div>
                ) : null}
                {allBlockEntities.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {allBlockEntities.map((entity) => (
                      <div key={`${entity.kind}-${entity.x}-${entity.y}-${entity.z}-${entity.label ?? ""}`} style={{ border: "1px solid #253044", borderRadius: 10, padding: 10 }}>
                        <strong>{entity.kind}</strong> <code>{entity.id}</code>
                        <div style={mutedStyle}>Position: {entity.x}, {entity.y}, {entity.z}</div>
                        {entity.nbtId ? <div>NBT ID: <code>{entity.nbtId}</code></div> : null}
                        {entity.nbtStatus ? <div>Status: {entity.nbtStatus === "written" ? "NBT written" : "metadata-only"}</div> : null}
                        {entity.label ? <div>Label: {entity.label}</div> : null}
                        {entity.text?.length ? <div>Text: {entity.text.join(" / ")}</div> : null}
                        {entity.nbtWarnings?.length ? <div style={mutedStyle}>Warnings: {entity.nbtWarnings.join(" / ")}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={mutedStyle}>No block entities recorded.</p>
                )}
              </Section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
