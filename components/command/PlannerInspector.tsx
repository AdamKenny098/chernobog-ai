"use client";

type ActivePlanSnapshot = {
  id: string;
  title: string;
  status: string;
  stepCount: number;
  activeStep: string | null;
};

type PlannerInspectorProps = {
  activePlan: ActivePlanSnapshot | null;
};

export default function PlannerInspector({ activePlan }: PlannerInspectorProps) {
  return (
    <section className="space-y-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#ffb066]/70">
          Planner Coordination
        </div>
        <div className="mt-1 text-xs text-[#d6d1c7]/45">
          Persistent active plan state
        </div>
      </div>

      {!activePlan ? (
        <div className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3 text-sm text-[#d6d1c7]/45">
          No active plan. Issue a directive like “make a plan for V4.7”.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-[rgba(255,160,70,0.12)] bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#d6d1c7]/35">
              Active Plan
            </div>
            <div className="mt-2 text-sm font-semibold text-[#d6d1c7]">
              {activePlan.title}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#d6d1c7]/35">
                Status
              </div>
              <div className="mt-1 font-mono text-xs text-[#ffb066]">
                {activePlan.status.toUpperCase()}
              </div>
            </div>

            <div className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[#d6d1c7]/35">
                Steps
              </div>
              <div className="mt-1 font-mono text-xs text-[#ffb066]">
                {activePlan.stepCount}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,160,70,0.12)] bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#d6d1c7]/35">
              Current Step
            </div>
            <div className="mt-2 text-sm text-[#d6d1c7]/75">
              {activePlan.activeStep ?? "No active step."}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,160,70,0.08)] bg-black/20 p-3 text-xs text-[#d6d1c7]/45">
            Try: “next step”, “complete step 1”, “show current plan”, or “clear current plan”.
          </div>
        </div>
      )}
    </section>
  );
}