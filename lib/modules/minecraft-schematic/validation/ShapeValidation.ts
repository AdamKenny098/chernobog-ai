import { DEFAULT_BLOCK_REGISTRY } from '../shape/BlockRegistry';
import type { BlockDefinition, BlockStateValue, ParsedBlockState } from '../shape/BlockDefinition';
import { parseBlockState } from '../shape/blockStateString';
import { isCardinalDirection, offsetForDirection, oppositeDirection } from '../shape/directions';
import type { ShapeGridEntry, ShapeKernelGrid } from '../shape/ShapeKernelGrid';
import { getGridBlock, getGridEntries } from '../shape/ShapeKernelGrid';

export type ShapeValidationSeverity = 'error' | 'warning';
export type ShapeValidationCategory =
  | 'invalid_block'
  | 'invalid_state'
  | 'unsupported_complex_block'
  | 'missing_support'
  | 'malformed_multiblock'
  | 'warning';

export type ShapeValidationIssue = {
  severity: ShapeValidationSeverity;
  category: ShapeValidationCategory;
  message: string;
  x?: number;
  y?: number;
  z?: number;
  blockState?: string;
};

export type ShapeValidationReport = {
  valid: boolean;
  blockCount: number;
  nonAirBlockCount: number;
  invalidBlocks: number;
  invalidStates: number;
  unsupportedComplexBlocks: number;
  missingSupport: number;
  malformedMultiBlocks: number;
  warnings: number;
  issues: ShapeValidationIssue[];
};

export function validateShapeGrid(grid: ShapeKernelGrid): ShapeValidationReport {
  const entries = getGridEntries(grid).filter((entry) => parseBlockState(entry.blockState).id !== 'minecraft:air');
  const issues: ShapeValidationIssue[] = [];

  for (const entry of entries) {
    validateSingleBlock(entry, issues);
  }

  for (const entry of entries) {
    validateSupportRules(grid, entry, issues);
    validateMultiBlockRules(grid, entry, issues);
  }

  const report: ShapeValidationReport = {
    valid: !issues.some((issue) => issue.severity === 'error'),
    blockCount: entries.length,
    nonAirBlockCount: entries.length,
    invalidBlocks: countIssues(issues, 'invalid_block'),
    invalidStates: countIssues(issues, 'invalid_state'),
    unsupportedComplexBlocks: countIssues(issues, 'unsupported_complex_block'),
    missingSupport: countIssues(issues, 'missing_support'),
    malformedMultiBlocks: countIssues(issues, 'malformed_multiblock'),
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
    issues,
  };

  return report;
}

export function formatValidationReport(report: ShapeValidationReport): string {
  const lines: string[] = [];
  lines.push(`Validation: ${report.valid ? 'PASS' : 'FAIL'}`);
  lines.push(`Block count: ${report.blockCount}`);
  lines.push(`Invalid blocks: ${report.invalidBlocks}`);
  lines.push(`Invalid states: ${report.invalidStates}`);
  lines.push(`Unsupported complex blocks: ${report.unsupportedComplexBlocks}`);
  lines.push(`Missing support: ${report.missingSupport}`);
  lines.push(`Malformed multi-block structures: ${report.malformedMultiBlocks}`);
  lines.push(`Warnings: ${report.warnings}`);

  if (report.issues.length > 0) {
    lines.push('Issues:');
    for (const issue of report.issues.slice(0, 80)) {
      const position = issue.x === undefined ? '' : ` @ ${issue.x},${issue.y},${issue.z}`;
      lines.push(`- [${issue.severity}/${issue.category}]${position} ${issue.message}`);
    }

    if (report.issues.length > 80) {
      lines.push(`- ... ${report.issues.length - 80} more issue(s) hidden. Run a JSON/debug output mode to inspect all issues.`);
    }
  }

  return lines.join('\n');
}

function validateSingleBlock(entry: ShapeGridEntry, issues: ShapeValidationIssue[]): void {
  const parsed = parseBlockState(entry.blockState);
  const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);

  if (!definition) {
    addIssue(issues, entry, 'error', 'invalid_block', `Unknown block id: ${parsed.id}`);
    return;
  }

  if (definition.unsupportedReason || definition.kind === 'unsupported_complex') {
    addIssue(issues, entry, 'warning', 'unsupported_complex_block', definition.unsupportedReason ?? `Unsupported complex block kind: ${definition.kind}`);
  }

  validateProperties(entry, parsed, definition, issues);
}

function validateProperties(
  entry: ShapeGridEntry,
  parsed: ParsedBlockState,
  definition: BlockDefinition,
  issues: ShapeValidationIssue[],
): void {
  const propertyRules = definition.properties ?? {};

  for (const [propertyName, rule] of Object.entries(propertyRules)) {
    const value = parsed.properties[propertyName];

    if (value === undefined || value === null) {
      if (rule.required) {
        addIssue(issues, entry, 'error', 'invalid_state', `${parsed.id} is missing required state property '${propertyName}'.`);
      }
      continue;
    }

    if (!rule.values.some((allowed) => valuesEqual(allowed, value))) {
      addIssue(
        issues,
        entry,
        'error',
        'invalid_state',
        `${parsed.id} has invalid state '${propertyName}=${String(value)}'. Allowed values: ${rule.values.map(String).join(', ')}.`,
      );
    }
  }

  for (const propertyName of Object.keys(parsed.properties)) {
    if (!propertyRules[propertyName]) {
      addIssue(issues, entry, 'warning', 'warning', `${parsed.id} has unregistered state property '${propertyName}'.`);
    }
  }
}

function validateSupportRules(grid: ShapeKernelGrid, entry: ShapeGridEntry, issues: ShapeValidationIssue[]): void {
  const parsed = parseBlockState(entry.blockState);
  const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
  if (!definition) return;

  if (definition.kind === 'ladder') {
    const facing = parsed.properties.facing;
    if (!isCardinalDirection(facing)) return;

    const backingDirection = oppositeDirection(facing);
    const offset = offsetForDirection(backingDirection);
    const supportState = getGridBlock(grid, entry.x + offset.dx, entry.y, entry.z + offset.dz);
    if (!isSolidSupport(supportState)) {
      addIssue(
        issues,
        entry,
        'error',
        'missing_support',
        `Ladder facing ${facing} requires backing support at ${entry.x + offset.dx},${entry.y},${entry.z + offset.dz}.`,
      );
    }
  }

  if (parsed.id === 'minecraft:wall_torch') {
    const facing = parsed.properties.facing;
    if (!isCardinalDirection(facing)) return;

    const backingDirection = oppositeDirection(facing);
    const offset = offsetForDirection(backingDirection);
    const supportState = getGridBlock(grid, entry.x + offset.dx, entry.y, entry.z + offset.dz);
    if (!isSolidSupport(supportState)) {
      addIssue(
        issues,
        entry,
        'error',
        'missing_support',
        `Wall torch facing ${facing} requires backing support at ${entry.x + offset.dx},${entry.y},${entry.z + offset.dz}.`,
      );
    }
  }

  if (definition.kind === 'lantern') {
    const hanging = parsed.properties.hanging === true;
    const supportY = hanging ? entry.y + 1 : entry.y - 1;
    const supportState = getGridBlock(grid, entry.x, supportY, entry.z);
    if (!isSolidSupport(supportState)) {
      addIssue(
        issues,
        entry,
        'error',
        'missing_support',
        `${parsed.id} requires ${hanging ? 'ceiling' : 'floor'} support at ${entry.x},${supportY},${entry.z}.`,
      );
    }
  }
}

function validateMultiBlockRules(grid: ShapeKernelGrid, entry: ShapeGridEntry, issues: ShapeValidationIssue[]): void {
  const parsed = parseBlockState(entry.blockState);
  const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
  if (definition?.kind !== 'door') return;

  const half = parsed.properties.half;
  if (half !== 'lower' && half !== 'upper') {
    addIssue(issues, entry, 'error', 'malformed_multiblock', `${parsed.id} door must declare half=lower or half=upper.`);
    return;
  }

  const partnerY = half === 'lower' ? entry.y + 1 : entry.y - 1;
  const partnerState = getGridBlock(grid, entry.x, partnerY, entry.z);
  const partner = partnerState ? parseBlockState(partnerState) : undefined;

  if (!partner || partner.id !== parsed.id) {
    addIssue(
      issues,
      entry,
      'error',
      'malformed_multiblock',
      `${parsed.id} door ${half} half is missing matching ${half === 'lower' ? 'upper' : 'lower'} half at ${entry.x},${partnerY},${entry.z}.`,
    );
    return;
  }

  const expectedPartnerHalf = half === 'lower' ? 'upper' : 'lower';
  if (partner.properties.half !== expectedPartnerHalf) {
    addIssue(
      issues,
      entry,
      'error',
      'malformed_multiblock',
      `${parsed.id} door partner at ${entry.x},${partnerY},${entry.z} has half=${String(partner.properties.half)}, expected ${expectedPartnerHalf}.`,
    );
  }

  compareDoorProperty(entry, parsed, partner, 'facing', issues);
  compareDoorProperty(entry, parsed, partner, 'hinge', issues);
  compareDoorProperty(entry, parsed, partner, 'open', issues);
  compareDoorProperty(entry, parsed, partner, 'powered', issues);
}

function compareDoorProperty(
  entry: ShapeGridEntry,
  parsed: ParsedBlockState,
  partner: ParsedBlockState,
  propertyName: string,
  issues: ShapeValidationIssue[],
): void {
  if (parsed.properties[propertyName] !== partner.properties[propertyName]) {
    addIssue(
      issues,
      entry,
      'warning',
      'malformed_multiblock',
      `${parsed.id} door property '${propertyName}' differs between halves.`,
    );
  }
}

function isSolidSupport(blockState: string | undefined): boolean {
  if (!blockState) return false;
  const parsed = parseBlockState(blockState);
  if (parsed.id === 'minecraft:air') return false;
  const definition = DEFAULT_BLOCK_REGISTRY.get(parsed.id);
  return Boolean(definition?.isSolidSupport || definition?.canAttachTo);
}

function addIssue(
  issues: ShapeValidationIssue[],
  entry: ShapeGridEntry,
  severity: ShapeValidationSeverity,
  category: ShapeValidationCategory,
  message: string,
): void {
  issues.push({
    severity,
    category,
    message,
    x: entry.x,
    y: entry.y,
    z: entry.z,
    blockState: entry.blockState,
  });
}

function countIssues(issues: ShapeValidationIssue[], category: ShapeValidationCategory): number {
  return issues.filter((issue) => issue.category === category).length;
}

function valuesEqual(a: BlockStateValue, b: BlockStateValue): boolean {
  return String(a) === String(b);
}
