import Link from "next/link";
import type { ChernobogRoute, ChernobogRouteStatus } from "@/lib/chernobog-ui/routeRegistry";

function statusStyles(status: ChernobogRouteStatus) {
  switch (status) {
    case "active":
      return { borderColor: "#3b8f5a", background: "rgba(59, 143, 90, 0.14)" };
    case "experimental":
      return { borderColor: "#9a7b2f", background: "rgba(154, 123, 47, 0.16)" };
    case "deprecated":
      return { borderColor: "#8f3b3b", background: "rgba(143, 59, 59, 0.16)" };
    case "hidden":
      return { borderColor: "#555", background: "rgba(85, 85, 85, 0.14)" };
    case "unknown":
    default:
      return { borderColor: "#555f7a", background: "rgba(85, 95, 122, 0.14)" };
  }
}

function isNavigable(route: ChernobogRoute) {
  return route.kind !== "api" && !route.path.includes("[");
}

export function ChernobogRouteCard({ route }: { route: ChernobogRoute }) {
  const statusStyle = statusStyles(route.status);

  return (
    <article
      style={{
        border: "1px solid " + statusStyle.borderColor,
        background: statusStyle.background,
        borderRadius: "14px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{route.label}</h3>
          <code style={{ color: "#c7c7d1", fontSize: "0.9rem" }}>{route.path}</code>
        </div>
        <span
          style={{
            border: "1px solid " + statusStyle.borderColor,
            borderRadius: "999px",
            padding: "3px 9px",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {route.status}
        </span>
      </div>

      <p style={{ margin: 0, color: "#d3d3dc", lineHeight: 1.55 }}>{route.description}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", color: "#aeb0bd", fontSize: "0.85rem" }}>
        <span>Kind: {route.kind}</span>
        {route.moduleId ? <span>Module: {route.moduleId}</span> : null}
      </div>

      {route.commands?.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {route.commands.map((command) => (
            <code key={command} style={{ background: "rgba(255,255,255,0.08)", borderRadius: "6px", padding: "3px 7px" }}>
              {command}
            </code>
          ))}
        </div>
      ) : null}

      <div>
        {isNavigable(route) ? (
          <Link href={route.path} style={{ color: "#e7e7ef", textDecoration: "underline" }}>
            Open
          </Link>
        ) : (
          <span style={{ color: "#8f91a1" }}>Dynamic or internal route</span>
        )}
      </div>
    </article>
  );
}
