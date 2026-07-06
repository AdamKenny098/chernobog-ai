const contextItems = [
  ["Active Project", "Chernobog"],
  ["Vault Memory", "Available"],
  ["Chernobog Inc", "Online"],
  ["Open Reviews", "Placeholder"],
  ["Current Task", "Command Center UI"],
];

export function ChernobogContextPanel() {
  return (
    <aside
      style={{
        borderLeft: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.24)",
        padding: "22px",
        minHeight: "100vh",
      }}
    >
      <h2 style={{ margin: "0 0 16px", fontSize: "1rem" }}>Context</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {contextItems.map(([label, value]) => (
          <section
            key={label}
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "12px",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ color: "#8f91a1", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
            <div style={{ marginTop: "5px", color: "#f1f1f6" }}>{value}</div>
          </section>
        ))}
      </div>
    </aside>
  );
}
