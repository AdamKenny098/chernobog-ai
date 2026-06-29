import type {
  BlueprintValidationResult,
  MinecraftBlueprint,
} from "../types/blueprint";
import { validateBlueprint } from "../validation/validateBlueprint";

export interface BlueprintRepairResult {
  blueprint: MinecraftBlueprint;
  validation: BlueprintValidationResult;
  repairStrategy: "accepted" | "auto_repaired" | "fallback_defaults";
}

/**
 * Repair pass for AI blueprint output.
 *
 * Current strategy:
 * 1. Validate.
 * 2. Auto-map aliases and clamp dimensions.
 * 3. Strip unsafe fields.
 * 4. Fall back to deterministic defaults if the root object is unusable.
 *
 * Later, this can call the LLM once more using the validation warnings, but that
 * regeneration should still go back through validateBlueprint before compiling.
 */
export function repairBlueprint(candidateBlueprint: unknown): BlueprintRepairResult {
  const validation = validateBlueprint(candidateBlueprint);

  const hasRepairs = Object.keys(validation.repairedFields).length > 0;
  const rootFallback = Boolean(validation.repairedFields.root);

  return {
    blueprint: validation.blueprint,
    validation,
    repairStrategy: rootFallback ? "fallback_defaults" : hasRepairs ? "auto_repaired" : "accepted",
  };
}
