import path from "node:path";
import { promises as fs } from "node:fs";
import type { TrustActionType, TrustRiskLevel } from "./trustActionTypes";

export type TrustPolicyRule = {
  id: string;
  title: string;
  actionType?: TrustActionType;
  requestedTool?: string;
  risk: TrustRiskLevel;
  reason: string;
  requiresExplicitApproval?: boolean;
  tags?: string[];
};

export type TrustPolicyManifest = {
  version: "v5.7";
  updatedAt: string;
  defaultRisk: TrustRiskLevel;
  rules: TrustPolicyRule[];
  forbiddenTargets: string[];
};

export type TrustPolicyStoreOptions = {
  rootDir?: string;
};

export type TrustPolicyStorePaths = {
  rootDir: string;
  policyPath: string;
};

const DEFAULT_GOVERNANCE_ROOT = path.join(
  process.cwd(),
  "vault",
  "chernobog",
  "system",
  "trust-governance"
);

export const DEFAULT_TRUST_POLICY_MANIFEST: TrustPolicyManifest = {
  version: "v5.7",
  updatedAt: "2026-06-29T00:00:00.000Z",
  defaultRisk: "requires_approval",
  forbiddenTargets: [
    ".env",
    ".env.local",
    "node_modules",
    ".git",
    "package-lock.json deletion",
    "vault/chernobog/system/trust-governance deletion",
  ],
  rules: [
    {
      id: "trust.safe.read",
      title: "Read-only inspection is safe automatic",
      actionType: "read",
      risk: "safe_auto",
      reason: "Read-only inspection does not mutate repo, vault, or external systems.",
      tags: ["read-only"],
    },
    {
      id: "trust.memory.read",
      title: "Approved memory recall is safe automatic",
      actionType: "memory-read",
      requestedTool: "vault.memory.read",
      risk: "safe_auto",
      reason: "Reading approved structured memory is non-mutating.",
      tags: ["vault", "memory"],
    },
    {
      id: "trust.file.read.notice",
      title: "File reads are safe with notice",
      actionType: "file-read",
      risk: "safe_with_notice",
      reason: "Reading local files is usually safe but should remain visible to the user.",
      tags: ["files"],
    },
    {
      id: "trust.memory.write.approval",
      title: "Memory writes require approval",
      actionType: "memory-write",
      risk: "requires_approval",
      reason: "Structured memory affects future answers and must be intentionally changed.",
      tags: ["vault", "memory", "write"],
    },
    {
      id: "trust.memory.approve.approval",
      title: "Memory approval requires approval",
      actionType: "memory-approve",
      requestedTool: "vault.memory.approve",
      risk: "requires_approval",
      reason: "Approving memory promotes it into vault truth.",
      tags: ["vault", "memory", "approval"],
    },
    {
      id: "trust.file.write.approval",
      title: "File writes require approval",
      actionType: "file-write",
      risk: "requires_approval",
      reason: "Writing files can alter the repo or vault and should be checkpointed.",
      tags: ["files", "write"],
    },
    {
      id: "trust.project.command.explicit",
      title: "Project commands require explicit approval",
      actionType: "project-command",
      risk: "dangerous_requires_explicit_approval",
      requiresExplicitApproval: true,
      reason: "Commands may change generated files, install packages, or mutate project state.",
      tags: ["command", "execution"],
    },
    {
      id: "trust.system.execute.explicit",
      title: "System execution requires explicit approval",
      actionType: "system-execute",
      risk: "dangerous_requires_explicit_approval",
      requiresExplicitApproval: true,
      reason: "System-level execution has broad side effects and must be explicit.",
      tags: ["system", "execution"],
    },
    {
      id: "trust.delete.forbidden",
      title: "Destructive deletion is forbidden by default",
      actionType: "delete",
      risk: "forbidden",
      reason: "Deletion should not be available to autonomous or inferred workflows by default.",
      tags: ["destructive"],
    },
    {
      id: "trust.external.send.approval",
      title: "External sends require approval",
      actionType: "external-send",
      risk: "requires_approval",
      reason: "Anything sent externally must be reviewed by the user first.",
      tags: ["external", "communication"],
    },
    {
      id: "trust.governance.edit.explicit",
      title: "Governance edits require explicit approval",
      actionType: "governance-edit",
      risk: "dangerous_requires_explicit_approval",
      requiresExplicitApproval: true,
      reason: "Changing the trust model changes what Chernobog is allowed to do.",
      tags: ["governance", "policy"],
    },
  ],
};

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, value: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export class TrustPolicyStore {
  readonly paths: TrustPolicyStorePaths;

  constructor(options: TrustPolicyStoreOptions = {}) {
    const rootDir = options.rootDir ?? process.env.CHERNOBOG_TRUST_GOVERNANCE_ROOT ?? DEFAULT_GOVERNANCE_ROOT;
    this.paths = {
      rootDir,
      policyPath: path.join(rootDir, "trust-policy.json"),
    };
  }

  async loadPolicy(): Promise<TrustPolicyManifest> {
    const policy = await readJsonFile<TrustPolicyManifest>(
      this.paths.policyPath,
      DEFAULT_TRUST_POLICY_MANIFEST
    );

    return {
      ...DEFAULT_TRUST_POLICY_MANIFEST,
      ...policy,
      rules: policy.rules?.length ? policy.rules : DEFAULT_TRUST_POLICY_MANIFEST.rules,
      forbiddenTargets: policy.forbiddenTargets?.length
        ? policy.forbiddenTargets
        : DEFAULT_TRUST_POLICY_MANIFEST.forbiddenTargets,
    };
  }

  async savePolicy(policy: TrustPolicyManifest): Promise<TrustPolicyManifest> {
    const next: TrustPolicyManifest = {
      ...policy,
      version: "v5.7",
      updatedAt: new Date().toISOString(),
    };

    await writeJsonFile(this.paths.policyPath, next);
    return next;
  }

  async ensureReady(): Promise<TrustPolicyManifest> {
    const policy = await this.loadPolicy();
    return this.savePolicy(policy);
  }
}

export function createTrustPolicyStore(options?: TrustPolicyStoreOptions): TrustPolicyStore {
  return new TrustPolicyStore(options);
}
