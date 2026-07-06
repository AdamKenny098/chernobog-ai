import Link from "next/link";
import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import { getAllChernobogModules } from "@/lib/chernobog-ui/moduleRegistry";
import { getAllChernobogRoutes } from "@/lib/chernobog-ui/routeRegistry";

export default function ModulesPage() {
  const modules = getAllChernobogModules();
  const routeById = new Map(getAllChernobogRoutes().map((route) => [route.id, route]));

  return (
    <ChernobogShell currentArea="Module Directory">
      <section style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 10px", fontSize: "2rem" }}>Chernobog Module Directory</h1>
        <p style={{ margin: 0, color: "#c9c9d2", lineHeight: 1.6 }}>
          Capability browser for core systems, vault memory, ingest flows, review workflows, schematic tooling, and development utilities.
        </p>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {modules.map((module) => (
          <article key={module.id} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "18px", background: "rgba(255,255,255,0.045)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ margin: 0 }}>{module.label}</h2>
                <div style={{ color: "#9fa1ad", marginTop: "4px" }}>{module.category}</div>
              </div>
              <span style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: "999px", padding: "3px 9px", fontSize: "0.75rem", textTransform: "uppercase" }}>
                {module.status}
              </span>
            </div>

            <p style={{ color: "#d3d3dc", lineHeight: 1.55 }}>{module.description}</p>
            <p style={{ color: "#aeb0bd", margin: "0 0 12px" }}>Owner: {module.ownerDepartment}</p>

            <div style={{ marginBottom: "12px" }}>
              <h3 style={{ fontSize: "0.95rem", margin: "0 0 8px" }}>Related Routes</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {module.relatedRouteIds.map((routeId) => {
                  const route = routeById.get(routeId);
                  if (!route) {
                    return <code key={routeId} style={{ color: "#9fa1ad" }}>{routeId}</code>;
                  }
                  const canOpen = route.kind !== "api" && !route.path.includes("[");
                  return canOpen ? (
                    <Link key={routeId} href={route.path} style={{ color: "#f0f0f4" }}>{route.label}</Link>
                  ) : (
                    <code key={routeId} style={{ color: "#9fa1ad" }}>{route.label}</code>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: "0.95rem", margin: "0 0 8px" }}>Related Commands</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {module.relatedCommands.map((command) => (
                  <code key={command} style={{ background: "rgba(255,255,255,0.08)", borderRadius: "6px", padding: "3px 7px" }}>
                    {command}
                  </code>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </ChernobogShell>
  );
}
