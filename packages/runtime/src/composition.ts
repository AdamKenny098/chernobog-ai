import type {
  ChernobogCompositionRoot,
} from "./types";

/**
 * Loads accepted public package boundaries into one explicit composition root.
 *
 * OH-1N intentionally does not switch existing entrypoints over to this root.
 * Calling this function is opt-in until OH-1O proves compatibility cleanup and
 * later runtime work elects to consume the root.
 */
export async function composeChernobogRuntime():
  Promise<ChernobogCompositionRoot> {
  const [
    contracts,
    events,
    trust,
    tools,
    models,
    vault,
    personalAssistance,
    core,
    observability,
    externalProjects,
  ] = await Promise.all([
    import("@chernobog/contracts"),
    import("@chernobog/events"),
    import("@chernobog/trust"),
    import("@chernobog/tools"),
    import("@chernobog/models"),
    import("@chernobog/vault"),
    import("@chernobog/personal-assistance"),
    import("@chernobog/core"),
    import("@chernobog/observability"),
    import("@chernobog/external-projects"),
  ]);

  const persistenceOwners = Object.freeze({
    core,
    events,
    vault,
    personalAssistance,
    externalProjects,
  });

  return Object.freeze({
    contracts,
    events,
    trust,
    tools,
    models,
    vault,
    personalAssistance,
    core,
    observability,
    externalProjects,
    persistenceOwners,
  });
}
