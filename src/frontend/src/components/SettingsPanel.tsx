import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/AudioEngine";

export function SettingsPanel() {
  const [preset, setPreset] = useState("STANDARD");
  const [autoGain, setAutoGain] = useState(false);
  const [bassEnhancement, setBassEnhancement] = useState(false);
  const [highClarity, setHighClarity] = useState(true);
  const [limiterMode, setLimiterMode] = useState<"EASE" | "HARD">("EASE");
  const autoGainRef = useRef(false);

  // Wire High Clarity on mount (default ON)
  useEffect(() => {
    audioEngine.setHighClarityMode(true);
  }, []);

  // Auto-gain polling loop
  useEffect(() => {
    autoGainRef.current = autoGain;
    if (!autoGain) return;
    const id = setInterval(() => {
      if (autoGainRef.current) audioEngine.setAutoGainCompensation(true);
    }, 500);
    return () => clearInterval(id);
  }, [autoGain]);

  const handlePreset = (val: string) => {
    setPreset(val);
    audioEngine.applyPreset(val);
  };

  const handleAutoGain = (val: boolean) => {
    setAutoGain(val);
    autoGainRef.current = val;
  };

  const handleBassEnhancement = (val: boolean) => {
    setBassEnhancement(val);
    audioEngine.setBassEnhancement(val);
  };

  const handleHighClarity = (val: boolean) => {
    setHighClarity(val);
    audioEngine.setHighClarityMode(val);
  };

  const handleLimiterMode = (val: "EASE" | "HARD") => {
    setLimiterMode(val);
    audioEngine.setLimiterMode(val);
  };

  return (
    <div
      className="rounded-lg p-5 space-y-5"
      style={{ background: "#0a0f1e", border: "2px solid #1e40af" }}
    >
      <h3
        className="text-sm font-bold tracking-widest"
        style={{
          color: "#facc15",
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        SYSTEM SETTINGS
      </h3>

      {/* FILL METER GREEN — the main power button */}
      <div>
        <button
          data-ocid="settings.fill_green.primary_button"
          type="button"
          onClick={() =>
            handlePreset(
              preset === "FILL METER GREEN" ? "STANDARD" : "FILL METER GREEN",
            )
          }
          className="w-full rounded py-3 font-black tracking-widest text-sm font-mono"
          style={{
            background: preset === "FILL METER GREEN" ? "#1e40af" : "#050a14",
            border: `2px solid ${
              preset === "FILL METER GREEN" ? "#3b82f6" : "#1e40af"
            }`,
            color: preset === "FILL METER GREEN" ? "#ffffff" : "#3b82f6",
            transition: "all 0.2s",
            cursor: "pointer",
            boxShadow:
              preset === "FILL METER GREEN" ? "0 0 20px #1e40af88" : "none",
          }}
        >
          {preset === "FILL METER GREEN"
            ? "◉ FILL METER GREEN — ACTIVE"
            : "◎ FILL METER GREEN"}
        </button>
        <div
          className="text-xs font-mono mt-1 text-center"
          style={{ color: "#475569" }}
        >
          Max clean signal — pushes meter bar full green all the way through
        </div>
      </div>

      {/* Master Output Preset */}
      <div className="space-y-1">
        <div
          className="text-xs font-bold font-mono"
          style={{ color: "#93c5fd" }}
        >
          MASTER OUTPUT PRESET
        </div>
        <select
          data-ocid="settings.select"
          value={preset}
          onChange={(e) => handlePreset(e.target.value)}
          className="w-full rounded px-3 py-2 text-sm font-mono"
          style={{
            background: "#0f172a",
            border: "1px solid #1e40af",
            color: "#e2e8f0",
            outline: "none",
          }}
        >
          <option value="STANDARD">STANDARD</option>
          <option value="GOLD PHANTOM KILLER">GOLD PHANTOM KILLER</option>
          <option value="BLUETOOTH MAX">BLUETOOTH MAX</option>
          <option value="LATE NIGHT">LATE NIGHT</option>
          <option value="FILL METER GREEN">FILL METER GREEN</option>
        </select>
      </div>

      {/* Toggle rows */}
      <div className="space-y-3">
        <ToggleRow
          label="AUTO-GAIN COMPENSATION"
          description="Keeps level consistent — polls every 500ms"
          value={autoGain}
          onChange={handleAutoGain}
          ocid="settings.auto_gain.toggle"
        />
        <ToggleRow
          label="BASS ENHANCEMENT"
          description="Warm bass shelf +4dB at 120Hz"
          value={bassEnhancement}
          onChange={handleBassEnhancement}
          ocid="settings.bass_enhancement.toggle"
        />
        <ToggleRow
          label="HIGH CLARITY MODE"
          description="+3dB–6dB high shelf at 3kHz for presence"
          value={highClarity}
          onChange={handleHighClarity}
          ocid="settings.high_clarity.toggle"
        />
      </div>

      {/* Limiter Mode */}
      <div className="space-y-1">
        <div
          className="text-xs font-bold font-mono"
          style={{ color: "#93c5fd" }}
        >
          OUTPUT LIMITER MODE
        </div>
        <div className="flex gap-2">
          <LimiterModeBtn
            active={limiterMode === "EASE"}
            label="EASE"
            description="Smart distortion cleaner — lets clean signal through"
            onClick={() => handleLimiterMode("EASE")}
            ocid="settings.limiter_ease.toggle"
          />
          <LimiterModeBtn
            active={limiterMode === "HARD"}
            label="HARD"
            description="Brick wall only — maximum ceiling"
            onClick={() => handleLimiterMode("HARD")}
            ocid="settings.limiter_hard.toggle"
            warning
          />
        </div>
      </div>

      {/* Signal Chain */}
      <div className="space-y-1">
        <div
          className="text-xs font-bold font-mono"
          style={{ color: "#93c5fd" }}
        >
          ACTIVE SIGNAL CHAIN
        </div>
        <div
          className="rounded px-3 py-2 text-xs font-mono leading-6"
          style={{
            background: "#050a14",
            border: "1px solid #1e3a6e",
            color: "#3b82f6",
          }}
        >
          SOURCE → A+B+C+D ENGINES → 10-BAND EQ → 80Hz
          <br />→ STABILIZER → NOISE GATE → STEREO MAGNET
          <br />→ CLARITY → AMP SAFT → COMMANDER → GAIN PASSES → MONITOR
          <br />→{" "}
          {limiterMode === "EASE" ? "LIMITER EASE" : "[ EASE BYPASSED ]"} →
          BRICK WALL → DB BOOST → VOLUME → OUTPUT
        </div>
      </div>

      {/* Active settings status */}
      <div className="flex flex-wrap gap-2">
        {preset !== "STANDARD" && (
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              background: "#1e3a6e",
              color: "#93c5fd",
              border: "1px solid #1e40af",
            }}
          >
            PRESET: {preset}
          </span>
        )}
        {autoGain && (
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              background: "#1e3a6e",
              color: "#93c5fd",
              border: "1px solid #1e40af",
            }}
          >
            AUTO-GAIN ON
          </span>
        )}
        {bassEnhancement && (
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              background: "#1e3a6e",
              color: "#93c5fd",
              border: "1px solid #1e40af",
            }}
          >
            BASS +4dB
          </span>
        )}
        {highClarity && (
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              background: "#1e3a6e",
              color: "#93c5fd",
              border: "1px solid #1e40af",
            }}
          >
            CLARITY +3–6dB
          </span>
        )}
        {limiterMode === "HARD" && (
          <span
            className="text-xs font-mono px-2 py-1 rounded"
            style={{
              background: "#450a0a",
              color: "#fca5a5",
              border: "1px solid #ef4444",
            }}
          >
            LIMITER: HARD
          </span>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  ocid,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  ocid: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div
          className="text-xs font-bold font-mono"
          style={{ color: "#93c5fd" }}
        >
          {label}
        </div>
        <div className="text-xs font-mono" style={{ color: "#475569" }}>
          {description}
        </div>
      </div>
      <button
        data-ocid={ocid}
        type="button"
        onClick={() => onChange(!value)}
        className="relative flex-shrink-0"
        style={{
          width: 48,
          height: 26,
          borderRadius: 13,
          background: value ? "#1e40af" : "#1e293b",
          border: `2px solid ${value ? "#3b82f6" : "#334155"}`,
          transition: "background 0.2s, border-color 0.2s",
          cursor: "pointer",
        }}
        aria-pressed={value}
        aria-label={label}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: value ? 22 : 2,
            width: 18,
            height: 18,
            borderRadius: 9,
            background: value ? "#60a5fa" : "#475569",
            transition: "left 0.2s",
            display: "block",
          }}
        />
      </button>
    </div>
  );
}

function LimiterModeBtn({
  active,
  label,
  description,
  onClick,
  ocid,
  warning,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
  ocid: string;
  warning?: boolean;
}) {
  const activeColor = warning ? "#ef4444" : "#1e40af";
  const activeBorder = warning ? "#ef4444" : "#3b82f6";
  return (
    <button
      data-ocid={ocid}
      type="button"
      onClick={onClick}
      className="flex-1 rounded px-3 py-2 text-left"
      style={{
        background: active ? activeColor : "#0f172a",
        border: `1px solid ${active ? activeBorder : "#1e3a6e"}`,
        color: active ? "#ffffff" : "#475569",
        cursor: "pointer",
        transition: "background 0.2s",
      }}
    >
      <div className="text-xs font-bold font-mono">{label}</div>
      <div className="text-xs font-mono" style={{ opacity: 0.7, fontSize: 9 }}>
        {description}
      </div>
    </button>
  );
}
