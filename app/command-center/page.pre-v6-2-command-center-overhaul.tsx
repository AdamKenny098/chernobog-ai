import Link from "next/link";
import { ChernobogRouteCard } from "@/components/chernobog-ui/ChernobogRouteCard";
import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import { getPrimaryNavigationRoutes } from "@/lib/chernobog-ui/routeRegistry";

const statusCards = [
  ["Chernobog Version", "V6.1"],
  ["Vault Memory", "Available"],
  ["Chernobog Inc", "Online"],
  ["Command Router", "Preserved"],
  ["Route Registry", "Online"],
];

const openWork = [
  ["Open Reviews", "Placeholder until wired to review APIs"],
  ["Memory Candidates", "Placeholder until wired to vault APIs"],
  ["Active Project", "Chernobog"],
  ["Recommended Next Action", "Run V6.1 verification and manual route checks"],
];

const departments = [
  "Executive Office",
  "Coding Department",
  "Design Department",
  "Vault / Archivist Department",
  "QA Department",
  "Security Department",
  "Operations Department",
  "Narrative Department",
];

export default function CommandCenterPage() {
  const primaryRoutes = getPrimaryNavigationRoutes();

  return (
    <ChernobogShell currentArea="Command Center">
      <section style={{ marginBottom: "26px" }}>
        <h1 style={{ margin: "0 0 10px", fontSize: "2.2rem" }}>Chernobog Command Center</h1>
        <p style={{ margin: 0, color: "#c9c9d2", lineHeight: 1.6 }}>
          Operational home screen for routing, modules, vault memory, reviews, and project control. This is a dashboard, not a replacement for the command console.
        </p>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2>System Status</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
          {statusCards.map(([label, value]) => (
            <article key={label} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "16px", background: "rgba(255,255,255,0.045)" }}>
              <div style={{ color: "#8f91a1", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
              <div style={{ marginTop: "8px", fontSize: "1.1rem", fontWeight: 700 }}>{value}</div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2>Primary Route Shortcuts</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
          {primaryRoutes.map((route) => (
            <ChernobogRouteCard key={route.id} route={route} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2>Open Work</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {openWork.map(([label, value]) => (
            <article key={label} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", padding: "16px", background: "rgba(255,255,255,0.04)" }}>
              <h3 style={{ margin: "0 0 8px" }}>{label}</h3>
              <p style={{ margin: 0, color: "#c9c9d2" }}>{value}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "30px" }}>
        <h2>Chernobog Inc Summary</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
          {departments.map((department) => (
            <div key={department} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px", background: "rgba(255,255,255,0.04)" }}>
              {department}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Module Overview</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <Link href="/modules" style={{ color: "#f0f0f4" }}>Open Modules</Link>
          <Link href="/routes" style={{ color: "#f0f0f4" }}>Open Routes</Link>
          <Link href="/vault" style={{ color: "#f0f0f4" }}>Open Vault</Link>
          <Link href="/command" style={{ color: "#f0f0f4" }}>Open Command Console</Link>
        </div>
      </section>
    </ChernobogShell>
  );
}
