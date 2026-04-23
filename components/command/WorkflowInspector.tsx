"use client";

type WorkflowInspectorProps = {
  route: string;
  workflowKind: string;
  workflowStep: string;
  workflowCandidateCount: number;
  searchQuery: string;
  searchRoot: string;
  selectedFile: string;
  readFile: string;
  lastTool: string;
  toolSummary: string;
  pendingState: string;
  isBusy: boolean;
};

function statusTone(props: WorkflowInspectorProps) {
  const step = props.workflowStep.toLowerCase();
  const pending = props.pendingState.toLowerCase();

  if (step === "failed") {
    return {
      label: "BLOCKED",
      accent: "text-[rgba(255,110,110,0.9)]",
      line: "bg-[linear-gradient(90deg,rgba(255,110,110,0.22),transparent)]",
      dot: "bg-[rgba(255,110,110,0.85)]",
      glow: "bg-[radial-gradient(circle_at_center,rgba(255,80,80,0.09)_0%,transparent_70%)]",
    };
  }

  if (
    step === "awaiting_selection" ||
    pending === "awaiting_file_selection" ||
    pending === "file selection required"
  ) {
    return {
      label: "SELECTION REQUIRED",
      accent: "text-[rgba(255,190,110,0.95)]",
      line: "bg-[linear-gradient(90deg,rgba(255,190,110,0.24),transparent)]",
      dot: "bg-[rgba(255,190,110,0.9)]",
      glow: "bg-[radial-gradient(circle_at_center,rgba(255,170,70,0.09)_0%,transparent_70%)]",
    };
  }

  if (props.isBusy || step === "reading" || step === "searching") {
    return {
      label: "ACTIVE",
      accent: "text-[rgba(255,165,90,0.95)]",
      line: "bg-[linear-gradient(90deg,rgba(255,165,90,0.24),transparent)]",
      dot: "bg-[rgba(255,165,90,0.9)]",
      glow: "bg-[radial-gradient(circle_at_center,rgba(255,145,55,0.08)_0%,transparent_70%)]",
    };
  }

  if (step === "completed" || step === "selected") {
    return {
      label: "RESOLVED",
      accent: "text-[rgba(210,190,150,0.92)]",
      line: "bg-[linear-gradient(90deg,rgba(210,190,150,0.18),transparent)]",
      dot: "bg-[rgba(210,190,150,0.82)]",
      glow: "bg-[radial-gradient(circle_at_center,rgba(255,145,55,0.05)_0%,transparent_70%)]",
    };
  }

  return {
    label: "STANDBY",
    accent: "text-[rgba(170,150,120,0.82)]",
    line: "bg-[linear-gradient(90deg,rgba(170,150,120,0.14),transparent)]",
    dot: "bg-[rgba(170,150,120,0.75)]",
    glow: "bg-[radial-gradient(circle_at_center,rgba(255,145,55,0.03)_0%,transparent_70%)]",
  };
}

function compact(value: string, fallback = "NONE") {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return fallback;
  return trimmed;
}

function fileNameOnly(value: string) {
  const normalized = compact(value);
  if (normalized === "NONE") return normalized;

  const slashIndex = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  return slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
}

function InspectorRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "dim" | "accent";
}) {
  const toneClass =
    tone === "accent"
      ? "text-[rgba(232,205,165,0.94)]"
      : tone === "dim"
      ? "text-[rgba(170,145,115,0.72)]"
      : "text-[rgba(205,190,165,0.86)]";

  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
      <div className="text-[9px] uppercase tracking-[0.2em] text-[rgba(160,128,92,0.68)]">
        {label}
      </div>
      <div className={`truncate text-[10px] uppercase tracking-[0.13em] ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export default function WorkflowInspector(props: WorkflowInspectorProps) {
  const tone = statusTone(props);

  return (
    <div className="relative h-full overflow-hidden">
      <div className={`pointer-events-none absolute inset-0 ${tone.glow}`} />
      <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.12),transparent)]" />
      <div className={`pointer-events-none absolute bottom-0 left-0 h-px w-[38%] ${tone.line}`} />
      <div className="pointer-events-none absolute left-[10px] top-[10px] h-[14px] w-[14px] border-l border-t border-[rgba(255,176,104,0.06)]" />
      <div className="pointer-events-none absolute right-[10px] bottom-[10px] h-[14px] w-[14px] border-b border-r border-[rgba(255,176,104,0.06)]" />

      <div className="relative z-10 flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.68)]">
              Workflow Inspector
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`h-[5px] w-[5px] rounded-full ${tone.dot}`} />
              <span className={`text-[10px] font-medium uppercase tracking-[0.22em] ${tone.accent}`}>
                {tone.label}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.18em] text-[rgba(150,122,90,0.62)]">
              Route
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[rgba(220,204,180,0.9)]">
              {compact(props.route)}
            </div>
          </div>
        </div>

        <div className="space-y-2 border border-[rgba(255,170,90,0.08)] bg-[rgba(255,170,90,0.02)] px-3 py-2">
          <InspectorRow label="Workflow" value={compact(props.workflowKind)} tone="accent" />
          <InspectorRow label="Step" value={compact(props.workflowStep)} />
          <InspectorRow
            label="Candidates"
            value={String(props.workflowCandidateCount)}
            tone={props.workflowCandidateCount > 0 ? "accent" : "dim"}
          />
          <InspectorRow label="Pending" value={compact(props.pendingState)} />
        </div>

        <div className="space-y-2">
          <InspectorRow label="Tool" value={compact(props.lastTool)} />
          <InspectorRow label="Query" value={compact(props.searchQuery)} />
          <InspectorRow label="Root" value={fileNameOnly(props.searchRoot)} tone="dim" />
          <InspectorRow label="Selected" value={fileNameOnly(props.selectedFile)} />
          <InspectorRow label="Read" value={fileNameOnly(props.readFile)} />
        </div>

        <div className="mt-auto border-t border-[rgba(255,170,90,0.08)] pt-3">
          <div className="mb-2 text-[9px] uppercase tracking-[0.2em] text-[rgba(160,128,92,0.68)]">
            Execution Summary
          </div>
          <p className="line-clamp-4 text-[10px] uppercase leading-[1.6] tracking-[0.1em] text-[rgba(186,169,145,0.78)]">
            {compact(props.toolSummary, "NO TOOL OUTPUT")}
          </p>
        </div>
      </div>
    </div>
  );
}