"use client";

import { useMemo, useState } from "react";

import { resolveSchematicThumbnail } from "../../visual-library/resolveSchematicThumbnail";
import type { VisualSchematicSummary } from "../../visual-library/types";
import visualStyles from "./schematicVisualLibrary.module.css";
import thumbnailStyles from "./schematicThumbnail.module.css";

type SchematicThumbnailProps = {
  schematic: VisualSchematicSummary;
};

export function SchematicThumbnail({ schematic }: SchematicThumbnailProps) {
  const thumbnail = useMemo(
    () => resolveSchematicThumbnail(schematic),
    [schematic],
  );

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  const activeCandidate = thumbnail.candidates[candidateIndex] ?? null;
  const shouldUseFallback = !activeCandidate;

  if (shouldUseFallback) {
    return <GeneratedVoxelFallback schematic={schematic} />;
  }

  return (
    <div className={thumbnailStyles.thumbnailShell}>
      <img
        className={`${thumbnailStyles.thumbnailImage} ${
          imageLoaded ? thumbnailStyles.thumbnailImageLoaded : ""
        }`}
        src={activeCandidate}
        alt={thumbnail.alt}
        draggable={false}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageLoaded(false);
          setCandidateIndex((currentIndex) => currentIndex + 1);
        }}
      />

      <div className={thumbnailStyles.thumbnailShade} />

      <div className={thumbnailStyles.thumbnailBadgeRow}>
        <span className={thumbnailStyles.thumbnailBadge}>Thumbnail</span>
        <span className={thumbnailStyles.thumbnailBadge}>
          {schematic.size.x} × {schematic.size.y} × {schematic.size.z}
        </span>
      </div>

      <div className={thumbnailStyles.thumbnailFooter}>
        <span>{schematic.category}</span>
        <span>{schematic.blockCount.toLocaleString()} blocks</span>
      </div>
    </div>
  );
}

function GeneratedVoxelFallback({
  schematic,
}: {
  schematic: VisualSchematicSummary;
}) {
  const cellCount = Math.max(
    12,
    Math.min(30, Math.round((schematic.size.x + schematic.size.z) / 2)),
  );

  return (
    <div className={visualStyles.previewBox} aria-label="Schematic preview placeholder">
      <div className={visualStyles.previewHeader}>
        <span className={visualStyles.pill}>Generated preview</span>
        <span className={visualStyles.pill}>
          {schematic.size.x} × {schematic.size.y} × {schematic.size.z}
        </span>
      </div>

      <div className={visualStyles.previewFloor} />

      <div className={visualStyles.previewGrid} aria-hidden="true">
        {Array.from({ length: cellCount }).map((_, index) => (
          <span key={index} className={visualStyles.previewCell} />
        ))}
      </div>
    </div>
  );
}
