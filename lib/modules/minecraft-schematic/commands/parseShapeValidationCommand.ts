export type ShapeValidationParsedCommand = {
  module: 'minecraft-schematic';
  action: 'validate-latest';
  raw: string;
};

export function parseShapeValidationCommand(input: string): ShapeValidationParsedCommand | null {
  const raw = input.trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, ' ');

  if (normalized === 'schematic validate latest' || normalized === 'minecraft schematic validate latest') {
    return {
      module: 'minecraft-schematic',
      action: 'validate-latest',
      raw,
    };
  }

  return null;
}
