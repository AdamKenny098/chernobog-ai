"use client";

import { Activity, Gauge, Orbit, ScanLine, Signal, Waves } from "lucide-react";

type TelemetryMetric = {
  label: string;
  value: string;
  detail: string;
  level: number;
};

type TelemetryStream = {
  label: string;
  value: string;
};

type TelemetryPanelProps = {
  title?: string;
  metrics?: TelemetryMetric[];
  streams?: TelemetryStream[];
};

function detailStyles(detail: string) {
  const key = detail.toLowerCase();

  if (key.includes("nominal")) {
    return {
      text: "text-[rgba(238,182,108,0.86)]",
      dot: "bg-[rgba(255,170,90,0.72)]",
      line: "from-[rgba(255,170,90,0.42)] to-transparent",
    };
  }

  if (key.includes("stable")) {
    return {
      text: "text-[rgba(233,178,104,0.82)]",
      dot: "bg-[rgba(255,170,90,0.62)]",
      line: "from-[rgba(255,170,90,0.34)] to-transparent",
    };
  }

  if (key.includes("within")) {
    return {
      text: "text-[rgba(214,164,98,0.74)]",
      dot: "bg-[rgba(255,170,90,0.42)]",
      line: "from-[rgba(255,170,90,0.22)] to-transparent",
    };
  }

  return {
    text: "text-[rgba(228,172,102,0.78)]",
    dot: "bg-[rgba(255,170,90,0.56)]",
    line: "from-[rgba(255,170,90,0.28)] to-transparent",
  };
}

function MeterRow({ metric, index }: { metric: TelemetryMetric; index: number }) {
  const detail = detailStyles(metric.detail);

  return (
    <div className="group relative overflow-hidden">
      <div
        className="
          absolute inset-0
          [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)]
          border border-[rgba(255,170,90,0.12)]
          bg-[linear-gradient(180deg,rgba(255,170,90,0.024),rgba(255,170,90,0.006))]
          shadow-[inset_0_0_0_1px_rgba(255,190,120,0.02),inset_0_-14px_32px_rgba(0,0,0,0.18)]
        "
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.014),transparent_72%,rgba(120,16,16,0.035))]" />
        <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.14),transparent)]" />
        <div className="absolute bottom-[8px] left-[8px] h-[14px] w-[14px] border-b border-l border-[rgba(255,176,104,0.07)]" />
        <div className="absolute right-[8px] top-[8px] h-[14px] w-[14px] border-r border-t border-[rgba(255,176,104,0.07)]" />
        <div className={`absolute bottom-0 left-0 h-px w-[38%] bg-gradient-to-r ${detail.line}`} />
        <div className="absolute right-0 top-0 h-full w-[2px] bg-[rgba(255,170,90,0.14)] opacity-50" />
      </div>

      <div className="relative z-10 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="h-px w-7 bg-[linear-gradient(90deg,rgba(255,170,90,0.18),transparent)]" />
              <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.76)]">
                {metric.label}
              </span>
            </div>

            <div className="mt-2 text-[19px] font-medium uppercase tracking-[0.12em] text-[rgba(239,233,224,0.95)]">
              {metric.value}
            </div>
          </div>

          <div className="mt-0.5 flex flex-col items-end gap-2">
            <div className={`text-[9px] uppercase tracking-[0.22em] ${detail.text}`}>
              {metric.detail}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${detail.dot} shadow-[0_0_8px_rgba(255,170,90,0.22)]`} />
              <span className="h-px w-6 bg-[linear-gradient(90deg,rgba(255,170,90,0.26),transparent)]" />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="relative h-[9px] overflow-hidden border border-[rgba(255,170,90,0.14)] bg-[rgba(255,170,90,0.03)] shadow-[inset_0_0_12px_rgba(0,0,0,0.22)]">
            <div className="absolute inset-0 opacity-[0.3] [background-image:linear-gradient(90deg,rgba(255,180,100,0.15)_1px,transparent_1px)] [background-size:14px_100%]" />
            <div className="absolute inset-y-[1px] left-[1px] right-[1px] opacity-[0.18] [background-image:linear-gradient(180deg,rgba(255,220,185,0.8),transparent)]" />
            <div
              className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,rgba(255,132,42,0.56),rgba(255,178,102,0.96),rgba(255,230,196,0.82))] shadow-[0_0_12px_rgba(255,160,75,0.16)]"
              style={{ width: `${metric.level}%` }}
            />
            <div
              className="absolute inset-y-0 w-[2px] bg-[rgba(255,244,226,0.9)] shadow-[0_0_10px_rgba(255,220,180,0.24)]"
              style={{ left: `calc(${metric.level}% - 1px)` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[8px] uppercase tracking-[0.22em] text-[rgba(168,143,114,0.64)]">
            <span>00</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>99</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalBand({ stream, index }: { stream: TelemetryStream; index: number }) {
  return (
    <div className="group relative overflow-hidden px-3 py-2.5">
      <div
        className="
          absolute inset-0
          [clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]
          border border-[rgba(255,170,90,0.09)]
          bg-[linear-gradient(180deg,rgba(255,170,90,0.018),rgba(255,170,90,0.004))]
          shadow-[inset_0_0_0_1px_rgba(255,190,120,0.018)]
        "
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 h-px w-[42%] bg-[linear-gradient(90deg,rgba(255,166,82,0.28),transparent)]" />
        <div className="absolute right-[8px] top-[8px] h-[10px] w-[10px] border-r border-t border-[rgba(255,176,104,0.06)]" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="h-px w-6 bg-[linear-gradient(90deg,rgba(255,170,90,0.16),transparent)]" />
            <span className="text-[9px] uppercase tracking-[0.22em] text-[rgba(183,133,86,0.72)]">
              {stream.label}
            </span>
          </div>

          <div className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-[rgba(223,214,201,0.86)]">
            {stream.value}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[rgba(255,170,90,0.74)] shadow-[0_0_8px_rgba(255,170,90,0.24)]" />
          <span className="h-px w-7 bg-[linear-gradient(90deg,rgba(255,170,90,0.28),transparent)]" />
        </div>
      </div>
    </div>
  );
}

export default function TelemetryPanel({
  title = "TELEMETRY",
  metrics = [
    {
      label: "Directive Throughput",
      value: "84.2%",
      detail: "nominal",
      level: 84,
    },
    {
      label: "Optic Convergence",
      value: "88.1%",
      detail: "stable",
      level: 88,
    },
    {
      label: "Cognitive Load",
      value: "34.8%",
      detail: "within band",
      level: 35,
    },
  ],
  streams = [
    { label: "Signal Relay", value: "NONE" },
    { label: "Memory State", value: "NO TOOL ACTIVITY YET." },
    { label: "Toolchain", value: "NONE" },
    { label: "Session Layer", value: "NONE" },
  ],
}: TelemetryPanelProps) {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[6%] top-[30px] h-px w-[92px] bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.14))]" />
        <div className="absolute left-[4%] top-[74px] bottom-[44px] w-px bg-[linear-gradient(180deg,rgba(255,170,90,0.1),transparent,rgba(255,170,90,0.1))]" />
        <div className="absolute left-[4%] top-[86px] flex h-[calc(100%-140px)] flex-col justify-between">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-[2px] w-[2px] rounded-full bg-[rgba(255,170,90,0.28)]" />
              <span className="h-px w-2 bg-[rgba(255,170,90,0.08)]" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="
                relative flex h-[34px] w-[34px] items-center justify-center
                [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]
                border border-[rgba(255,170,90,0.16)]
                bg-[linear-gradient(180deg,rgba(255,170,90,0.045),rgba(255,170,90,0.014))]
                text-[rgba(221,170,112,0.86)]
                shadow-[inset_0_0_0_1px_rgba(255,190,120,0.02)]
              "
            >
              <Activity className="h-4 w-4" strokeWidth={1.75} />
            </div>

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-[rgba(219,210,197,0.84)]">
                {title}
              </div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
                OBSERVATION ARRAY
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[rgba(233,178,104,0.78)]">
            <Signal className="h-3.5 w-3.5" strokeWidth={1.7} />
            <Gauge className="h-3.5 w-3.5" strokeWidth={1.7} />
            <ScanLine className="h-3.5 w-3.5" strokeWidth={1.7} />
          </div>
        </div>

        <div className="relative overflow-hidden px-4 py-3.5">
          <div
            className="
              absolute inset-0
              [clip-path:polygon(16px_0,100%_0,100%_calc(100%-16px),calc(100%-16px)_100%,0_100%,0_16px)]
              border border-[rgba(255,170,90,0.1)]
              bg-[linear-gradient(180deg,rgba(255,170,90,0.025),rgba(255,170,90,0.006))]
            "
          />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.018),transparent_30%,transparent_78%,rgba(120,16,16,0.04))]" />
            <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.16),transparent)]" />
            <div className="absolute right-[10px] top-[10px] h-[16px] w-[16px] border-r border-t border-[rgba(255,176,104,0.08)]" />
            <div className="absolute bottom-[10px] left-[10px] h-[16px] w-[16px] border-b border-l border-[rgba(255,176,104,0.08)]" />
            <div className="absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,180,100,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,180,100,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
          </div>

          <div className="relative z-10">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.74)]">
                LIVE CORE READINGS
              </div>

              <div className="flex items-center gap-2">
                <Orbit className="h-3.5 w-3.5 text-[rgba(233,178,104,0.7)]" strokeWidth={1.8} />
                <Waves className="h-3.5 w-3.5 text-[rgba(233,178,104,0.7)]" strokeWidth={1.8} />
              </div>
            </div>

            <div className="space-y-2.5">
              {metrics.map((metric, index) => (
                <MeterRow key={metric.label} metric={metric} index={index} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {streams.map((stream, index) => (
            <SignalBand key={stream.label} stream={stream} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}