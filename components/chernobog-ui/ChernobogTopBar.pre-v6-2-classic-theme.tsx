export function ChernobogTopBar({ currentArea }: { currentArea: string }) {
  return (
    <header
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        padding: "18px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <div>
        <div style={{ color: "#8f91a1", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.14em" }}>
          Chernobog V6.1
        </div>
        <h2 style={{ margin: "4px 0 0", fontSize: "1.2rem" }}>{currentArea}</h2>
      </div>
      <div style={{ color: "#bfc1cc", fontSize: "0.9rem" }}>Route Registry Online</div>
    </header>
  );
}
