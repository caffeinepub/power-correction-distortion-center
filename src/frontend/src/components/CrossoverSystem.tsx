import { useState } from "react";

interface CrossoverSystemProps {
  onBassThump: (val: number) => void;
  onKick: (val: number) => void;
  onDrop: (val: number) => void;
}

export function CrossoverSystem({
  onBassThump,
  onKick,
  onDrop,
}: CrossoverSystemProps) {
  const [bassThump, setBassThump] = useState(0);
  const [kick, setKick] = useState(0);
  const [drop, setDrop] = useState(0);

  function handleBassThump(val: number) {
    setBassThump(val);
    onBassThump(val);
  }

  function handleKick(val: number) {
    setKick(val);
    onKick(val);
  }

  function handleDrop(val: number) {
    setDrop(val);
    onDrop(val);
  }

  const sliderRow = (
    label: string,
    sublabel: string,
    val: number,
    min: number,
    max: number,
    ocid: string,
    onChange: (v: number) => void,
  ) => (
    <div
      className="rounded p-4 space-y-3"
      style={{ background: "#060c1a", border: "1px solid #1e3a6e" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: "#3b82f6" }}
          >
            {label}
          </span>
          <div
            className="text-xs font-mono mt-0.5"
            style={{ color: "#334155" }}
          >
            {sublabel}
          </div>
        </div>
        <span
          className="text-sm font-bold font-mono"
          style={{
            color: val > 0 ? "#ef4444" : val < 0 ? "#60a5fa" : "#475569",
          }}
        >
          {val > 0 ? `+${val}` : val} dB
        </span>
      </div>
      <input
        data-ocid={ocid}
        type="range"
        min={min}
        max={max}
        step="0.5"
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: val > 0 ? "#ef4444" : "#3b82f6", height: "8px" }}
      />
      <div
        className="flex justify-between text-xs font-mono"
        style={{ color: "#1e3a6e" }}
      >
        <span>{min} dB</span>
        <span>FLAT</span>
        <span>+{max} dB</span>
      </div>
    </div>
  );

  return (
    <div
      data-ocid="crossover.panel"
      className="rounded-lg p-5 space-y-5"
      style={{ background: "#0a0f1e", border: "2px solid #1e40af" }}
    >
      <h3
        className="text-sm font-bold tracking-widest"
        style={{
          color: "#3b82f6",
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        SR22 CROSSOVER SYSTEM
      </h3>

      <p
        className="text-xs font-bold tracking-wider"
        style={{ color: "#1e40af" }}
      >
        ADAPTIVE CHIP · BASS LOCKED FROM HIGHS · 5 CORRECTIONS + HARD CORRECTION
        BUILT IN
      </p>

      {/* Super Chip Display */}
      <div
        className="rounded-lg p-4 flex items-center gap-4"
        style={{
          background: "#080e1c",
          border: "2px solid #dc2626",
          boxShadow:
            "0 0 20px rgba(220,38,38,0.4), inset 0 0 16px rgba(220,38,38,0.05)",
        }}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Pulsing dot */}
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{
              background: "#ef4444",
              boxShadow: "0 0 12px rgba(239,68,68,0.9)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div>
            <div
              className="font-mono font-black tracking-widest"
              style={{
                color: "#ef4444",
                fontSize: "13px",
                letterSpacing: "0.2em",
              }}
            >
              SUPER CHIP — SPEAKER DETECTION ACTIVE
            </div>
            <div
              className="font-mono text-xs mt-1"
              style={{ color: "#7f1d1d" }}
            >
              SIGNAL POWER · SMART ADVANCE · ADAPTIVE CORRECTION
            </div>
          </div>
        </div>
        <div
          className="text-right font-mono text-xs"
          style={{ color: "#dc2626", flexShrink: 0 }}
        >
          <div className="font-black text-base" style={{ color: "#ef4444" }}>
            xxxx
          </div>
          <div>HARD CORR</div>
        </div>
      </div>

      {/* Crossover bands display */}
      <div
        className="grid grid-cols-3 gap-2 rounded p-3"
        style={{ background: "#060c1a", border: "1px solid #1e3a6e" }}
      >
        {[
          { label: "BASS", range: "< 250 Hz", color: "#ef4444" },
          { label: "MID", range: "250–4kHz", color: "#3b82f6" },
          { label: "HIGH", range: "> 4kHz", color: "#60a5fa" },
        ].map((band) => (
          <div key={band.label} className="text-center">
            <div
              className="font-mono font-black text-xs"
              style={{ color: band.color }}
            >
              {band.label}
            </div>
            <div
              className="font-mono text-xs mt-0.5"
              style={{ color: "#334155" }}
            >
              {band.range}
            </div>
          </div>
        ))}
      </div>

      <div
        className="text-xs font-mono text-center py-2 rounded"
        style={{
          background: "#050810",
          color: "#1e40af",
          border: "1px solid #0d1a36",
        }}
      >
        Bass cannot enter highs. Single speaker supported.
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        {sliderRow(
          "BASS THUMP",
          "60 Hz boost — warm deep thump",
          bassThump,
          -6,
          12,
          "crossover.input",
          handleBassThump,
        )}
        {sliderRow(
          "KICK",
          "80 Hz boost — kick punch control",
          kick,
          -6,
          12,
          "crossover.secondary_button",
          handleKick,
        )}
        {sliderRow(
          "DROP",
          "40 Hz sub boost — deep sub drop",
          drop,
          -6,
          8,
          "crossover.toggle",
          handleDrop,
        )}
      </div>
    </div>
  );
}
