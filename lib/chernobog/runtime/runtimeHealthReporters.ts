import type {
    ChernobogHealthStatus,
    ChernobogRuntimeObservation,
  } from "./runtimeHealth";
  
  import {
    createRuntimeObservation,
  } from "./runtimeHealth";
  
  import {
    publishRuntimeHealthObservation,
  } from "./runtimeHealthEvents";
  
  export interface RuntimeHealthReportOptions {
    previousStatus?: ChernobogHealthStatus;
  }
  
  export interface ServiceHealthReport {
    id: string;
  
    status: ChernobogHealthStatus;
  
    nodeId?: string;
  
    platform?: string;
  
    latencyMs?: number;
  
    capabilities?: string[];
  
    message?: string;
  
    metadata?: Record<
      string,
      string | number | boolean | null
    >;
  
    observedAt?: string;
  }
  
  export interface RuntimeNodeHealthReport {
    id: string;
  
    status: ChernobogHealthStatus;
  
    nodeId?: string;
  
    platform?: string;
  
    latencyMs?: number;
  
    capabilities?: string[];
  
    message?: string;
  
    metadata?: Record<
      string,
      string | number | boolean | null
    >;
  
    observedAt?: string;
  }
  
  function buildObservation(
    kind:
      | "service"
      | "runtime-node",
    report:
      | ServiceHealthReport
      | RuntimeNodeHealthReport
  ): ChernobogRuntimeObservation {
    return createRuntimeObservation({
      id:
        report.id,
  
      kind,
  
      status:
        report.status,
  
      nodeId:
        report.nodeId,
  
      platform:
        report.platform,
  
      latencyMs:
        report.latencyMs,
  
      capabilities:
        report.capabilities,
  
      message:
        report.message,
  
      metadata:
        report.metadata,
  
      observedAt:
        report.observedAt,
    });
  }
  
  export async function reportServiceHealth(
    report: ServiceHealthReport,
    options:
      RuntimeHealthReportOptions = {}
  ): Promise<ChernobogRuntimeObservation> {
    const observation =
      buildObservation(
        "service",
        report
      );
  
    await publishRuntimeHealthObservation(
      observation,
      {
        previousStatus:
          options.previousStatus,
      }
    );
  
    return observation;
  }
  
  export async function reportRuntimeNodeHealth(
    report: RuntimeNodeHealthReport,
    options:
      RuntimeHealthReportOptions = {}
  ): Promise<ChernobogRuntimeObservation> {
    const observation =
      buildObservation(
        "runtime-node",
        report
      );
  
    await publishRuntimeHealthObservation(
      observation,
      {
        previousStatus:
          options.previousStatus,
      }
    );
  
    return observation;
  }