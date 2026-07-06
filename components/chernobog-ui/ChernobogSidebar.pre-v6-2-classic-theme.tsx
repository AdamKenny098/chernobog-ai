import Link from "next/link";
import { getPrimaryNavigationRoutes } from "@/lib/chernobog-ui/routeRegistry";

export function ChernobogSidebar() {
  const routes = getPrimaryNavigationRoutes();

  return (
    <aside
      style={{
        borderRight: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.34)",
        padding: "22px",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontSize: "0.75rem", color: "#8f91a1", textTransform: "uppercase", letterSpacing: "0.16em" }}>
          Chernobog
        </div>
        <h1 style={{ margin: "6px 0 0", fontSize: "1.35rem" }}>Command Center</h1>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {routes.map((route) => (
          <Link
            key={route.id}
            href={route.path}
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px",
              color: "#f0f0f4",
              padding: "11px 12px",
              textDecoration: "none",
              background: "rgba(255,255,255,0.045)",
            }}
          >
            <div style={{ fontWeight: 650 }}>{route.label}</div>
            <div style={{ color: "#9fa1ad", fontSize: "0.8rem" }}>{route.path}</div>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
