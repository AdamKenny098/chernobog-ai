import styles from "../saved-content-watch.module.css";

export default function WatchHotkeyPanel() {
  return (
    <section className={styles.hotkeyPanel}>
      <h3>Hotkeys</h3>
      <ul>
        <li>O — open original</li>
        <li>W — mark watched</li>
        <li>A — analyze later</li>
        <li>S — skip</li>
        <li>D — dismiss</li>
        <li>N — next</li>
        <li>B — previous</li>
        <li>R — refresh</li>
      </ul>
    </section>
  );
}
