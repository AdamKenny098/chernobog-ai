"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ModelEntry = {
  id: string;
  provider: string;
  model: string;
  displayName: string;
  roles: string[];
  capabilities: string[];
  enabled: boolean;
  local: boolean;
  availability: string;
  version?: string;
  strengths: string[];
  weaknesses: string[];
  contextLimits: {
    known: boolean;
    contextWindowTokens?: number;
    maxOutputTokens?: number;
  };
  cost: {
    known: boolean;
    mode: string;
  };
  privacy: {
    execution: string;
    promptLeavesDevice: boolean | null;
    retention: string;
  };
};

type Snapshot = {
  generatedAt: string;
  models: ModelEntry[];
  totals: {
    models: number;
    enabled: number;
    disabled: number;
    available: number;
    local: number;
    remote: number;
  };
};

type TestResult = {
  id: string;
  provider: string;
  model: string;
  ok: boolean;
  text?: string;
  error?: string;
  durationMs: number;
  attempts?: number;
  fallbackCount?: number;
};

type BenchmarkCheck = {
  id: string;
  label: string;
  weight: number;
  mandatory: boolean;
  passed: boolean;
  detail: string;
};

type BenchmarkScenario = {
  id: string;
  title: string;
  finalStatus: string;
  passed: boolean;
  checks: BenchmarkCheck[];
  humanInterventionCount: number;
  recoveryCount: number;
  stageExecutionCount: number;
  selectedProfile: string;
  selectedStrategy?: string;
  selectedModel?: string;
  actCount: number;
  notes: string[];
};

type BenchmarkReport = {
  version: string;
  benchmarkName: "Vespr Benchmark";
  generatedAt: string;
  mode: "deterministic-delegation-acceptance";
  score: number;
  maximumScore: number;
  percentage: number;
  passThreshold: number;
  passed: boolean;
  mandatoryFailures: string[];
  scenarios: BenchmarkScenario[];
  coverage: Record<string, boolean>;
  architecture: {
    fullStageOrder: string[];
    callerPreselectsModel: false;
    callerPreselectsStrategy: false;
    hiddenScratchReasoningRequired: false;
    liveProviderQualityMeasured: false;
  };
  notes: string[];
};

async function callControl(
  body?: Record<string, unknown>,
) {
  const response =
    await fetch(
      "/api/model-control",
      body
        ? {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                body,
              ),
          }
        : {
            cache:
              "no-store",
          },
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {
    throw new Error(
      data.error ??
      "Model Control Center request failed.",
    );
  }

  return data;
}

export function LLMControlCenterSurface() {
  const [
    snapshot,
    setSnapshot,
  ] =
    useState<Snapshot | null>(
      null,
    );

  const [
    selected,
    setSelected,
  ] =
    useState<string[]>([]);

  const [
    prompt,
    setPrompt,
  ] =
    useState(
      "Reply with a concise description of your strongest task category.",
    );

  const [
    output,
    setOutput,
  ] =
    useState<TestResult[]>([]);

  const [
    inspection,
    setInspection,
  ] =
    useState<ModelEntry | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    benchmarkReport,
    setBenchmarkReport,
  ] =
    useState<BenchmarkReport | null>(
      null,
    );

  const [
    benchmarkBusy,
    setBenchmarkBusy,
  ] = useState(false);

  const [
    benchmarkError,
    setBenchmarkError,
  ] =
    useState<string | null>(null);

  const refresh =
    useCallback(
      async () => {
        const data =
          await callControl();

        setSnapshot(
          data.snapshot,
        );
      },
      [],
    );

  useEffect(() => {
    void refresh()
      .catch(
        (value) =>
          setError(
            value instanceof Error
              ? value.message
              : String(value),
          ),
      );
  }, [refresh]);

  const models =
    snapshot?.models ??
    [];

  const selectedModels =
    useMemo(
      () =>
        models.filter(
          (model) =>
            selected.includes(
              model.id,
            ),
        ),
      [
        models,
        selected,
      ],
    );

  async function run(
    action:
      () => Promise<void>,
  ) {
    setBusy(true);
    setError(null);

    try {
      await action();
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : String(value),
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggle(
    model: ModelEntry,
  ) {
    await run(
      async () => {
        const data =
          await callControl({
            action:
              model.enabled
                ? "disable"
                : "enable",
            id:
              model.id,
          });

        setSnapshot(
          data.snapshot,
        );
      },
    );
  }

  async function inspect(
    id: string,
  ) {
    await run(
      async () => {
        const data =
          await callControl({
            action:
              "inspect",
            id,
          });

        setInspection(
          data.model,
        );
      },
    );
  }

  async function test(
    id: string,
  ) {
    await run(
      async () => {
        const data =
          await callControl({
            action:
              "test",
            id,
            prompt,
          });

        setOutput([
          data.result,
        ]);
      },
    );
  }

  async function compare() {
    await run(
      async () => {
        const data =
          await callControl({
            action:
              "compare",
            ids:
              selected,
            prompt,
          });

        setOutput(
          data.results,
        );
      },
    );
  }

  async function addModel(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const form =
      new FormData(
        event.currentTarget,
      );

    await run(
      async () => {
        const data =
          await callControl({
            action:
              "add",
            entry: {
              provider:
                String(
                  form.get(
                    "provider",
                  ) ??
                  "",
                ),
              model:
                String(
                  form.get(
                    "model",
                  ) ??
                  "",
                ),
              displayName:
                String(
                  form.get(
                    "displayName",
                  ) ??
                  "",
                ),
              roles: [
                "default",
              ],
              capabilities: [
                "chat",
              ],
            },
          });

        setSnapshot(
          data.snapshot,
        );

        event.currentTarget
          .reset();
      },
    );
  }

  async function runBenchmark() {
    setBenchmarkBusy(true);
    setBenchmarkError(null);

    try {
      const response =
        await fetch(
          "/api/cognition/vespr-benchmark",
          {
            method: "POST",
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ??
          "Vespr Benchmark request failed.",
        );
      }

      setBenchmarkReport(
        data.report as BenchmarkReport,
      );
    } catch (value) {
      setBenchmarkError(
        value instanceof Error
          ? value.message
          : String(value),
      );
    } finally {
      setBenchmarkBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <header className="border border-[#5d3214]/80 bg-[#070503]/95 p-4">
        <div className="text-[8px] uppercase tracking-[0.42em] text-[#c9782f]/68">
          Chernobog / Cognitive Administration
        </div>
        <h1 className="mt-2 text-2xl font-semibold uppercase tracking-[0.24em] text-[#ffe0ac]">
          LLM Control Center
        </h1>
        <p className="mt-2 max-w-4xl text-xs leading-5 text-[#b7a386]">
          Replaceable administrative surface over the core model registry and gateway.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="#model-control"
            className="border border-[#c9782f]/60 bg-[#281508]/35 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#ffd28a]"
          >
            Model Control
          </a>
          <a
            href="#vespr-benchmark"
            className="border border-[#5d3214]/70 bg-black/25 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#b7a386]"
          >
            Vespr Benchmark
          </a>
        </div>

        {snapshot ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Models", snapshot.totals.models],
              ["Enabled", snapshot.totals.enabled],
              ["Disabled", snapshot.totals.disabled],
              ["Available", snapshot.totals.available],
              ["Local", snapshot.totals.local],
              ["Remote", snapshot.totals.remote],
            ].map(
              ([label, value]) => (
                <div
                  key={String(label)}
                  className="border border-[#5d3214]/70 bg-black/25 p-2"
                >
                  <div className="text-[7px] uppercase tracking-[0.24em] text-[#8e785c]">
                    {label}
                  </div>
                  <div className="mt-1 font-mono text-sm text-[#ffd28a]">
                    {value}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="border border-red-400/40 bg-red-950/20 p-3 text-xs text-red-200">
          {error}
        </div>
      ) : null}

      <div
        id="model-control"
        className="grid scroll-mt-4 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <section className="border border-[#5d3214]/80 bg-[#070503]/95 p-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffe0ac]">
              Registered Models
            </h2>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(refresh)}
              className="border border-[#c9782f]/60 px-2 py-1 text-[8px] uppercase tracking-[0.2em] text-[#ffd28a]"
            >
              Refresh
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {models.map(
              (model) => (
                <article
                  key={model.id}
                  className="border border-[#5d3214]/55 bg-[#090604] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs text-[#ffe0ac]">
                        {model.displayName}
                      </div>
                      <div className="mt-1 text-[8px] uppercase tracking-[0.18em] text-[#8e785c]">
                        {model.id}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="border border-[#5d3214]/70 px-1.5 py-0.5 text-[7px] uppercase text-[#b7a386]">
                        {model.provider}
                      </span>
                      <span className="border border-[#5d3214]/70 px-1.5 py-0.5 text-[7px] uppercase text-[#b7a386]">
                        {model.local ? "local" : "remote"}
                      </span>
                      <span className="border border-[#5d3214]/70 px-1.5 py-0.5 text-[7px] uppercase text-[#b7a386]">
                        {model.availability}
                      </span>
                      <span
                        className={
                          model.enabled
                            ? "border border-emerald-400/40 px-1.5 py-0.5 text-[7px] uppercase text-emerald-200"
                            : "border border-red-400/40 px-1.5 py-0.5 text-[7px] uppercase text-red-200"
                        }
                      >
                        {model.enabled ? "enabled" : "disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.16em] text-[#b7a386]">
                      <input
                        type="checkbox"
                        checked={selected.includes(model.id)}
                        onChange={() =>
                          setSelected(
                            (current) =>
                              current.includes(model.id)
                                ? current.filter((id) => id !== model.id)
                                : [...current, model.id],
                          )
                        }
                      />
                      compare
                    </label>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void inspect(model.id)}
                      className="border border-[#5d3214]/70 px-2 py-1 text-[8px] uppercase text-[#b7a386]"
                    >
                      Inspect
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void test(model.id)}
                      className="border border-[#5d3214]/70 px-2 py-1 text-[8px] uppercase text-[#b7a386]"
                    >
                      Test
                    </button>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggle(model)}
                      className="border border-[#c9782f]/60 px-2 py-1 text-[8px] uppercase text-[#ffd28a]"
                    >
                      {model.enabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>

        <aside className="grid content-start gap-3">
          <section className="border border-[#5d3214]/80 bg-[#070503]/95 p-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffe0ac]">
              Add Model
            </h2>

            <form
              className="mt-3 grid gap-2"
              onSubmit={(event) => void addModel(event)}
            >
              <input
                name="provider"
                required
                placeholder="provider"
                className="border border-[#5d3214]/60 bg-black/30 px-2 py-1.5 text-xs text-[#ffe0ac]"
              />
              <input
                name="model"
                required
                placeholder="model id/name"
                className="border border-[#5d3214]/60 bg-black/30 px-2 py-1.5 text-xs text-[#ffe0ac]"
              />
              <input
                name="displayName"
                placeholder="display name"
                className="border border-[#5d3214]/60 bg-black/30 px-2 py-1.5 text-xs text-[#ffe0ac]"
              />
              <button
                disabled={busy}
                className="border border-[#c9782f]/60 bg-[#281508]/50 px-2 py-1.5 text-[8px] uppercase tracking-[0.2em] text-[#ffd28a]"
              >
                Register
              </button>
            </form>
          </section>

          <section className="border border-[#5d3214]/80 bg-[#070503]/95 p-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffe0ac]">
              Test / Compare
            </h2>

            <p className="mt-2 text-[9px] leading-4 text-[#8e785c]">
              Live model test surface. Prompts are sent through the registered provider path and returned duration/output is measured separately from the deterministic Vespr architecture benchmark.
            </p>

            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              className="mt-3 w-full border border-[#5d3214]/60 bg-black/30 p-2 text-xs leading-5 text-[#ffe0ac]"
            />

            <button
              type="button"
              disabled={busy || selectedModels.length < 2}
              onClick={() => void compare()}
              className="mt-2 w-full border border-[#c9782f]/60 px-2 py-1.5 text-[8px] uppercase tracking-[0.2em] text-[#ffd28a] disabled:opacity-40"
            >
              Compare Selected ({selectedModels.length})
            </button>
          </section>
        </aside>
      </div>

      {inspection ? (
        <section className="border border-[#5d3214]/80 bg-[#070503]/95 p-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffe0ac]">
            Model Inspection
          </h2>
          <pre className="mt-3 overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-[#b7a386]">
            {JSON.stringify(inspection, null, 2)}
          </pre>
        </section>
      ) : null}

      {output.length > 0 ? (
        <section className="border border-[#5d3214]/80 bg-[#070503]/95 p-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffe0ac]">
            Test Output
          </h2>
          <div className="mt-3 grid gap-2">
            {output.map(
              (result) => (
                <article
                  key={result.id}
                  className="border border-[#5d3214]/55 bg-black/25 p-3"
                >
                  <div className="font-mono text-[10px] text-[#ffd28a]">
                    {result.id} Â· {result.durationMs}ms
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-[#b7a386]">
                    {result.ok
                      ? result.text
                      : result.error}
                  </pre>
                </article>
              ),
            )}
          </div>
        </section>
      ) : null}

      <section
        id="vespr-benchmark"
        className="scroll-mt-4 border border-[#5d3214]/80 bg-[#070503]/95 p-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffe0ac]">
              Vespr Benchmark
            </h2>
            <p className="mt-2 max-w-4xl text-[9px] leading-4 text-[#b7a386]">
              Deterministic OH-4AE delegation and control-plane acceptance test. It validates architecture behaviour such as clarification, routing, planning, authority, recovery, interruption and provenance. It does not measure live Qwen, DeepSeek, Ollama or other provider quality.
            </p>
          </div>

          <button
            type="button"
            disabled={benchmarkBusy}
            onClick={() => void runBenchmark()}
            className="border border-[#c9782f]/60 bg-[#281508]/50 px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#ffd28a] disabled:opacity-40"
          >
            {benchmarkBusy
              ? "Running Benchmark..."
              : "Run Vespr Benchmark"}
          </button>
        </div>

        <div className="mt-3 border border-[#5d3214]/55 bg-black/25 p-3 text-[9px] leading-4 text-[#8e785c]">
          <span className="font-semibold uppercase tracking-[0.16em] text-[#ffd28a]">
            Benchmark integrity:
          </span>{" "}
          Scenario model identifiers are deterministic routing fixtures used to exercise the OH-4 architecture. They are not measured model-performance results.
        </div>

        {benchmarkError ? (
          <div className="mt-3 border border-red-400/40 bg-red-950/20 p-3 text-xs text-red-200">
            {benchmarkError}
          </div>
        ) : null}

        {benchmarkBusy ? (
          <div className="mt-3 border border-[#5d3214]/55 bg-black/25 p-3 text-[9px] uppercase tracking-[0.16em] text-[#b7a386]">
            Executing deterministic acceptance scenarios...
          </div>
        ) : null}

        {benchmarkReport ? (
          <div className="mt-3 grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border border-[#5d3214]/55 bg-black/25 p-3">
                <div className="text-[7px] uppercase tracking-[0.22em] text-[#8e785c]">
                  Overall Score
                </div>
                <div className="mt-1 font-mono text-sm text-[#ffd28a]">
                  {benchmarkReport.score}/{benchmarkReport.maximumScore} ({benchmarkReport.percentage}%)
                </div>
              </div>
              <div className="border border-[#5d3214]/55 bg-black/25 p-3">
                <div className="text-[7px] uppercase tracking-[0.22em] text-[#8e785c]">
                  Status
                </div>
                <div
                  className={[
                    "mt-1 font-mono text-sm",
                    benchmarkReport.passed
                      ? "text-emerald-200"
                      : "text-red-200",
                  ].join(" ")}
                >
                  {benchmarkReport.passed ? "PASS" : "FAIL"}
                </div>
              </div>
              <div className="border border-[#5d3214]/55 bg-black/25 p-3">
                <div className="text-[7px] uppercase tracking-[0.22em] text-[#8e785c]">
                  Pass Threshold
                </div>
                <div className="mt-1 font-mono text-sm text-[#ffd28a]">
                  {benchmarkReport.passThreshold}%
                </div>
              </div>
              <div className="border border-[#5d3214]/55 bg-black/25 p-3">
                <div className="text-[7px] uppercase tracking-[0.22em] text-[#8e785c]">
                  Live Provider Quality
                </div>
                <div className="mt-1 font-mono text-sm text-[#b7a386]">
                  {benchmarkReport.architecture.liveProviderQualityMeasured
                    ? "MEASURED"
                    : "NOT MEASURED"}
                </div>
              </div>
            </div>

            <section className="border border-[#5d3214]/55 bg-black/25 p-3">
              <h3 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#ffe0ac]">
                Mandatory Failures
              </h3>
              <div className="mt-2 font-mono text-[10px] leading-5 text-[#b7a386]">
                {benchmarkReport.mandatoryFailures.length > 0
                  ? benchmarkReport.mandatoryFailures.join(", ")
                  : "None"}
              </div>
            </section>

            <section className="border border-[#5d3214]/55 bg-black/25 p-3">
              <h3 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#ffe0ac]">
                Scenario Results
              </h3>
              <div className="mt-3 grid gap-2">
                {benchmarkReport.scenarios.map((scenario) => (
                  <article
                    key={scenario.id}
                    className="border border-[#5d3214]/45 bg-[#090604] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-mono text-[10px] text-[#ffd28a]">
                          {scenario.title}
                        </div>
                        <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[#8e785c]">
                          {scenario.id} / {scenario.finalStatus}
                        </div>
                      </div>
                      <span
                        className={
                          scenario.passed
                            ? "border border-emerald-400/40 px-2 py-1 text-[8px] uppercase text-emerald-200"
                            : "border border-red-400/40 px-2 py-1 text-[8px] uppercase text-red-200"
                        }
                      >
                        {scenario.passed ? "PASS" : "FAIL"}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-1 text-[9px] leading-4 text-[#8e785c] sm:grid-cols-2 lg:grid-cols-4">
                      <div>Profile: {scenario.selectedProfile}</div>
                      <div>Strategy: {scenario.selectedStrategy ?? "n/a"}</div>
                      <div>Routing fixture: {scenario.selectedModel ?? "n/a"}</div>
                      <div>Recoveries: {scenario.recoveryCount}</div>
                    </div>

                    <div className="mt-3 grid gap-1">
                      {scenario.checks.map((check) => (
                        <div
                          key={check.id}
                          className="border border-[#5d3214]/35 bg-black/20 p-2 text-[9px] leading-4 text-[#b7a386]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-mono text-[#ffd28a]">
                              {check.label}
                            </span>
                            <span className={check.passed ? "text-emerald-200" : "text-red-200"}>
                              {check.passed ? "PASS" : "FAIL"}
                              {check.mandatory ? " / mandatory" : ""}
                              {` / weight ${check.weight}`}
                            </span>
                          </div>
                          <div className="mt-1 text-[#8e785c]">
                            {check.detail}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid gap-2 lg:grid-cols-2">
              <div className="border border-[#5d3214]/55 bg-black/25 p-3">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#ffe0ac]">
                  Coverage
                </h3>
                <div className="mt-2 grid gap-1">
                  {Object.entries(benchmarkReport.coverage).map(([label, passed]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 text-[9px] text-[#b7a386]"
                    >
                      <span>{label}</span>
                      <span className={passed ? "text-emerald-200" : "text-red-200"}>
                        {passed ? "PASS" : "FAIL"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#5d3214]/55 bg-black/25 p-3">
                <h3 className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#ffe0ac]">
                  Diagnostics
                </h3>
                <div className="mt-2 text-[9px] leading-4 text-[#b7a386]">
                  <div>Mode: {benchmarkReport.mode}</div>
                  <div>Version: {benchmarkReport.version}</div>
                  <div>Generated: {benchmarkReport.generatedAt}</div>
                  <div>Caller preselects model: no</div>
                  <div>Caller preselects strategy: no</div>
                  <div>Hidden scratch reasoning required: no</div>
                </div>
                <div className="mt-3 grid gap-1">
                  {benchmarkReport.notes.map((note) => (
                    <div
                      key={note}
                      className="border-l border-[#c9782f]/45 pl-2 text-[9px] leading-4 text-[#8e785c]"
                    >
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
