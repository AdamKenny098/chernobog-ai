"use client";

import { useEffect, useState } from "react";
import { getAdultSettings } from "./gameRadarApi";
import { GameRadarShell } from "./GameRadarShell";
import type { AdultSettings } from "./types";
import styles from "./game-radar.module.css";

const SESSION_KEY = "chernobog-game-radar-adult-confirmed";

export function AdultGameRadarGate() {
  const [settings, setSettings] = useState<AdultSettings | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setConfirmed(sessionStorage.getItem(SESSION_KEY) === "yes"));
    getAdultSettings().then((response) => setSettings(response.settings)).catch(() => setSettings(null));
  }, []);

  if (declined) return <main className={styles.ageGate}><section><h1>GAME RADAR LOCKED</h1><p>This section remains closed for the current session.</p></section></main>;
  if (!settings) return <main className={styles.ageGate}><section><p>LOADING ADULT DISCOVERY CONTROLS…</p></section></main>;
  if (settings.ageGateRequired && !confirmed) {
    return <main className={styles.ageGate}><section>
      <span className={styles.eyebrow}>CHERNOBOG / RESTRICTED DISCOVERY</span>
      <h1>18+ GAME RADAR</h1>
      <p>This local section contains adult-game listings and may display mature themes. Confirm that you are at least 18 and legally permitted to view adult content where you live.</p>
      <p className={styles.ageGateNote}>Chernobog stores only a session confirmation. It does not ask for or save your date of birth.</p>
      <div className={styles.ageGateActions}>
        <button type="button" onClick={() => { sessionStorage.setItem(SESSION_KEY, "yes"); setConfirmed(true); }}>I AM 18+ — ENTER</button>
        <button type="button" onClick={() => setDeclined(true)}>LEAVE</button>
      </div>
    </section></main>;
  }
  return <GameRadarShell adultSettings={settings} />;
}
