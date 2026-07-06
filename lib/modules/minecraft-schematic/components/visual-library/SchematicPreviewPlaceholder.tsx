import type { VisualSchematicSummary } from "../../visual-library/types";
import { SchematicThumbnail } from "./SchematicThumbnail";

type SchematicPreviewPlaceholderProps = {
  schematic: VisualSchematicSummary;
};

export function SchematicPreviewPlaceholder({
  schematic,
}: SchematicPreviewPlaceholderProps) {
  return <SchematicThumbnail schematic={schematic} />;
}
