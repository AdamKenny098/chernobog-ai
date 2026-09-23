export interface TrustAction<TPayload = unknown> {
  type: string;
  payload?: TPayload;
  actor?: string;
  resource?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface ApprovalRequirement {
  required: boolean;
  reason?: string;
  approvalClass?: string;
}

export interface TrustDecision {
  allowed: boolean;
  reason?: string;
  approval?: ApprovalRequirement;
  policyId?: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface TrustPolicy {
  evaluate(action: TrustAction): Promise<TrustDecision> | TrustDecision;
}

export interface TrustAuditEvent {
  action: TrustAction;
  decision: TrustDecision;
  occurredAt?: string;
  metadata?: Readonly<Record<string, unknown>>;
}
