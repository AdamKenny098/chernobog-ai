/**
 * Public composition-root types for the OH-1 architecture.
 *
 * The root references public package modules only. It does not expose private
 * implementation paths or create a second state/persistence authority.
 */
export type ContractsPackage = typeof import("@chernobog/contracts");
export type EventsPackage = typeof import("@chernobog/events");
export type TrustPackage = typeof import("@chernobog/trust");
export type ToolsPackage = typeof import("@chernobog/tools");
export type ModelsPackage = typeof import("@chernobog/models");
export type VaultPackage = typeof import("@chernobog/vault");
export type PersonalAssistancePackage =
  typeof import("@chernobog/personal-assistance");
export type CorePackage = typeof import("@chernobog/core");
export type ObservabilityPackage =
  typeof import("@chernobog/observability");
export type ExternalProjectsPackage =
  typeof import("@chernobog/external-projects");

export interface ChernobogPersistenceOwners {
  core: CorePackage;
  events: EventsPackage;
  vault: VaultPackage;
  personalAssistance: PersonalAssistancePackage;
  externalProjects: ExternalProjectsPackage;
}

export interface ChernobogCompositionRoot {
  contracts: ContractsPackage;
  events: EventsPackage;
  trust: TrustPackage;
  tools: ToolsPackage;
  models: ModelsPackage;
  vault: VaultPackage;
  personalAssistance: PersonalAssistancePackage;
  core: CorePackage;
  observability: ObservabilityPackage;
  externalProjects: ExternalProjectsPackage;
  persistenceOwners: ChernobogPersistenceOwners;
}
