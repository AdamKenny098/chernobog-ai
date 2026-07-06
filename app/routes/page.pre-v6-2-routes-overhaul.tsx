import { ChernobogRouteCard } from "@/components/chernobog-ui/ChernobogRouteCard";
import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import { getAllChernobogRoutes, type ChernobogRoute, type ChernobogRouteKind } from "@/lib/chernobog-ui/routeRegistry";

const KIND_ORDER: ChernobogRouteKind[] = ["core", "vault", "inc", "review", "module", "settings", "debug", "api", "legacy"];

function groupRoutesByKind(routes: ChernobogRoute[]) {
  return routes.reduce<Record<ChernobogRouteKind, ChernobogRoute[]>>((groups, route) => {
    groups[route.kind] = groups[route.kind] ?? [];
    groups[route.kind].push(route);
    return groups;
  }, {} as Record<ChernobogRouteKind, ChernobogRoute[]>);
}

export default function RoutesPage() {
  const routes = getAllChernobogRoutes();
  const groupedRoutes = groupRoutesByKind(routes);
  const activeCount = routes.filter((route) => route.status === "active").length;
  const nonActiveCount = routes.length - activeCount;

  return (
    <ChernobogShell currentArea="Route Directory">
      <section style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 10px", fontSize: "2rem" }}>Chernobog Route Directory</h1>
        <p style={{ margin: 0, color: "#c9c9d2", lineHeight: 1.6 }}>
          Central registry-backed map of user-facing pages, module pages, review routes, API routes, and legacy surfaces.
        </p>
        <p style={{ margin: "10px 0 0", color: "#aeb0bd" }}>
          {routes.length} route entries. {activeCount} active. {nonActiveCount} experimental, hidden, deprecated, or unknown.
        </p>
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {KIND_ORDER.map((kind) => {
          const kindRoutes = groupedRoutes[kind] ?? [];
          if (!kindRoutes.length) return null;

          return (
            <section key={kind}>
              <h2 style={{ margin: "0 0 14px", textTransform: "capitalize" }}>{kind} Routes</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                {kindRoutes.map((route) => (
                  <ChernobogRouteCard key={route.id} route={route} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </ChernobogShell>
  );
}
