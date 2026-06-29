import path from 'node:path';
import { readFile } from 'node:fs/promises';
import type { ShapeValidationParsedCommand } from './parseShapeValidationCommand';

type CommandResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

type LatestFile = Record<string, unknown>;
type MetadataFile = Record<string, unknown>;

export async function executeValidateLatestSchematicCommand(
  command: ShapeValidationParsedCommand,
  options: { exportsDir?: string } = {},
): Promise<CommandResult> {
  if (command.action !== 'validate-latest') {
    return { ok: false, message: `Unsupported schematic validation command: ${command.action}` };
  }

  const exportsDir = options.exportsDir ?? path.join(process.cwd(), 'exports', 'schematics');

  try {
    const latest = await readJson<LatestFile>(path.join(exportsDir, 'latest.json'));
    const metadata = await resolveLatestMetadata(exportsDir, latest);
    const validation = findValidationPayload(metadata ?? latest);
    const resolverReports = findResolverReports(metadata ?? latest);

    if (!validation) {
      return {
        ok: false,
        message: [
          'Validation: unavailable',
          'No stored shape validation report was found for latest schematic.',
          'Regenerate the tower with Milestone 3 builder and store buildResult.validation in the metadata sidecar.',
        ].join('\n'),
        data: { latest, metadata },
      };
    }

    return {
      ok: isValidationPass(validation),
      message: formatStoredValidation(validation, resolverReports),
      data: { validation, resolverReports, metadata },
    };
  } catch (error) {
    return {
      ok: false,
      message: `Could not validate latest schematic: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function resolveLatestMetadata(exportsDir: string, latest: LatestFile): Promise<MetadataFile | undefined> {
  const candidates = [
    latest.metadataJsonPath,
    latest.metadataPath,
    latest.metadataFile,
    latest.metadataJson,
    latest.metadata_json,
    latest.metadata,
    nested(latest, ['files', 'metadata']),
    nested(latest, ['paths', 'metadata']),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  for (const candidate of candidates) {
    const candidatePath = path.isAbsolute(candidate)
      ? candidate
      : candidate.includes('exports/schematics')
        ? path.join(process.cwd(), candidate)
        : path.join(exportsDir, candidate);
    try {
      return await readJson<MetadataFile>(candidatePath);
    } catch {
      // Continue trying candidates. Latest metadata formats changed during earlier milestones.
    }
  }

  if (typeof latest.name === 'string') {
    const stem = latest.name.replace(/\.schem$/i, '');
    const guessed = path.join(exportsDir, `${stem}.metadata.json`);
    try {
      return await readJson<MetadataFile>(guessed);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function findValidationPayload(value: unknown): Record<string, unknown> | undefined {
  if (!isObject(value)) return undefined;

  const directCandidates = [
    value.validation,
    value.shapeValidation,
    value.shape_validation,
    nested(value, ['buildResult', 'validation']),
    nested(value, ['build', 'validation']),
  ];

  for (const candidate of directCandidates) {
    if (isValidationPayload(candidate)) return candidate;
  }

  return undefined;
}

function findResolverReports(value: unknown): unknown[] | undefined {
  if (!isObject(value)) return undefined;

  const candidate = value.resolverReports ?? value.shapeResolverReports ?? nested(value, ['buildResult', 'resolverReports']);
  return Array.isArray(candidate) ? candidate : undefined;
}

function formatStoredValidation(validation: Record<string, unknown>, resolverReports: unknown[] | undefined): string {
  const lines: string[] = [];
  lines.push(`Validation: ${isValidationPass(validation) ? 'PASS' : 'FAIL'}`);
  lines.push(`Block count: ${numberValue(validation.blockCount) ?? numberValue(validation.nonAirBlockCount) ?? 'unknown'}`);
  lines.push(`Invalid blocks: ${numberValue(validation.invalidBlocks) ?? 0}`);
  lines.push(`Invalid states: ${numberValue(validation.invalidStates) ?? 0}`);
  lines.push(`Unsupported complex blocks: ${numberValue(validation.unsupportedComplexBlocks) ?? 0}`);
  lines.push(`Missing support: ${numberValue(validation.missingSupport) ?? 0}`);
  lines.push(`Malformed multi-block structures: ${numberValue(validation.malformedMultiBlocks) ?? 0}`);
  lines.push(`Warnings: ${numberValue(validation.warnings) ?? 0}`);

  if (resolverReports?.length) {
    lines.push('Resolver passes:');
    for (const report of resolverReports) {
      if (!isObject(report)) continue;
      lines.push(`- ${String(report.passName ?? 'unknown')}: changed ${String(report.changed ?? 0)} block(s)`);
    }
  }

  const issues = Array.isArray(validation.issues) ? validation.issues : [];
  if (issues.length > 0) {
    lines.push('Issues:');
    for (const issue of issues.slice(0, 80)) {
      if (!isObject(issue)) continue;
      const position = issue.x === undefined ? '' : ` @ ${issue.x},${issue.y},${issue.z}`;
      lines.push(`- [${String(issue.severity ?? 'unknown')}/${String(issue.category ?? 'unknown')}]${position} ${String(issue.message ?? '')}`);
    }
  }

  return lines.join('\n');
}

async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

function isValidationPayload(value: unknown): value is Record<string, unknown> {
  return isObject(value) && ('valid' in value || 'issues' in value || 'blockCount' in value);
}

function isValidationPass(validation: Record<string, unknown>): boolean {
  return validation.valid === true;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function nested(value: unknown, keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (!isObject(current)) return undefined;
    current = current[key];
  }
  return current;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
