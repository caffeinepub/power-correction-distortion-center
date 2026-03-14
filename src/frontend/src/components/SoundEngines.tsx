import { useState } from "react";
import { audioEngine } from "../audio/AudioEngine";

const ENGINES = [
  { id: "A", label: "A+", color: "#3b82f6" },
  { id: "B", label: "B+", color: "#60a5fa" },
  { id: "C", label: "C+", color: "#93c5fd" },
  { id: "D", label: "D+", color: "#facc15" },
];

export function SoundEngines() {
  const [active, setActive] = useState([true, true, true, true]);

  const toggle = (i: number) => {
    const next = [...active];
    next[i] = !next[i];
    setActive(next);
    audioEngine.setEngineActive(i, next[i]);
  };

  return (
    <div
      data-ocid="engines.panel"
      className="rounded-lg p-5 space-y-4"
      style={{ background: "#0a0f1e", border: "2px solid #1e40af" }}
    >
      <h3
        className="text-sm font-bold tracking-widest"
        style={{
          color: "#facc15",
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        SOUND ENGINES
      </h3>

      <div className="flex items-center justify-center gap-0 flex-wrap">
        {ENGINES.map((eng, i) => (
          <div key={eng.id} className="flex items-center">
            <button
              type="button"
              data-ocid={`engines.toggle.${i + 1}`}
              onClick={() => toggle(i)}
              className="relative flex flex-col items-center p-4 rounded-lg"
              style={{
                background: active[i] ? "#0d1f4e" : "#0a0f1e",
                border: `2px solid ${active[i] ? eng.color : "#1e3a6e"}`,
                boxShadow: active[i]
                  ? `0 0 20px ${eng.color}40, 0 0 40px ${eng.color}20`
                  : "none",
                cursor: "pointer",
                minWidth: "90px",
                transition: "all 0.3s ease",
              }}
            >
              <div
                className="text-3xl font-black"
                style={{
                  color: active[i] ? eng.color : "#374151",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  textShadow: active[i] ? `0 0 20px ${eng.color}` : "none",
                }}
              >
                {eng.label}
              </div>
              <div className="mt-2 flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: active[i] ? "#22c55e" : "#ef4444",
                    boxShadow: active[i] ? "0 0 6px #22c55e" : "none",
                  }}
                />
                <span
                  className="text-xs font-mono"
                  style={{
                    color: active[i] ? "#22c55e" : "#ef4444",
                    fontSize: "9px",
                  }}
                >
                  {active[i] ? "ACTIVE" : "OFF"}
                </span>
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: "8px",
                  letterSpacing: "0.1em",
                  marginTop: "4px",
                }}
              >
                HIGH QUALITY
              </div>
              <div
                className="mt-2 w-full h-1 rounded-full overflow-hidden"
                style={{ background: "#1e3a6e" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: active[i] ? "100%" : "0%",
                    background: eng.color,
                    boxShadow: active[i] ? `0 0 4px ${eng.color}` : "none",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </button>
            {i < ENGINES.length - 1 && (
              <div
                className="text-2xl font-black mx-1"
                style={{ color: "#3b82f6", textShadow: "0 0 10px #3b82f6" }}
              >
                +
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        className="text-center text-xs font-mono"
        style={{ color: "#475569" }}
      >
        Click engines to toggle &#x2022; All output routed to Bluetooth &amp;
        phone speakers
      </div>
    </div>
  );
}
