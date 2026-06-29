import { promises as fs } from "fs";
import path from "path";

import { projectRoot } from "../paths";
import type {
  CreateMechanicalGraph,
  CreateMechanicalValidationResult,
} from "./types";
import type { CreateMachineCompileResult } from "./compileCreateMachineGraph";

export type CreateMechanicalArtifactPaths = {
  directory: string;
  graphJsonPath: string;
  validationJsonPath: string;
  compileJsonPath: string;
};

function createRelativePath(...parts: string[]): string {
  return path.join("exports", "schematics", "create", ...parts).replace(/\\/g, "/");
}

export async function exportCreateMechanicalArtifacts(input: {
  buildId: string;
  graph: CreateMechanicalGraph;
  validation: CreateMechanicalValidationResult;
  compileResult: CreateMachineCompileResult;
}): Promise<CreateMechanicalArtifactPaths> {
  const directory = path.join(projectRoot(), "exports", "schematics", "create");
  await fs.mkdir(directory, { recursive: true });

  const graphFileName = `${input.buildId}.mechanical-graph.json`;
  const validationFileName = `${input.buildId}.create-validation.json`;
  const compileFileName = `${input.buildId}.create-compile.json`;

  await fs.writeFile(
    path.join(directory, graphFileName),
    JSON.stringify(input.graph, null, 2),
    "utf8",
  );

  await fs.writeFile(
    path.join(directory, validationFileName),
    JSON.stringify(input.validation, null, 2),
    "utf8",
  );

  await fs.writeFile(
    path.join(directory, compileFileName),
    JSON.stringify(
      {
        buildId: input.buildId,
        graphId: input.graph.id,
        purpose: input.graph.purpose,
        placementOffset: input.compileResult.placementOffset,
        bounds: input.compileResult.bounds,
        notes: input.compileResult.notes,
        blockCount: input.compileResult.build.blockCount,
        size: input.compileResult.build.size,
      },
      null,
      2,
    ),
    "utf8",
  );

  return {
    directory: createRelativePath(),
    graphJsonPath: createRelativePath(graphFileName),
    validationJsonPath: createRelativePath(validationFileName),
    compileJsonPath: createRelativePath(compileFileName),
  };
}
