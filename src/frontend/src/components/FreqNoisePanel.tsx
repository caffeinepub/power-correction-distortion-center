import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { audioEngine } from "../audio/AudioEngine";

export function FreqNoisePanel() {
  const [hz, setHz] = useState(440);
  const [freqLevel, setFreqLevel] = useState(50);
  const [freqActive, setFreqActive] = useState(false);
  const [noiseGate, setNoiseGate] = useState(false);
  const [dbBoost, setDbBoost] = useState(0);

  const toggleFreq = (on: boolean) => {
    setFreqActive(on);
    audioEngine.setFreqGen(hz, freqLevel, on);
  };

  const updateHz = (val: number) => {
    setHz(val);
    if (freqActive) audioEngine.setFreqGen(val, freqLevel, true);
  };

  const updateLevel = (val: number) => {
    setFreqLevel(val);
    if (freqActive) audioEngine.setFreqGen(hz, val, true);
  };

  const updateDbBoost = (val: number) => {
    setDbBoost(val);
    audioEngine.setDBBoost(val);
  };

  const toggleNoise = (on: boolean) => {
    setNoiseGate(on);
    audioEngine.toggleNoiseGate(on);
  };

  return (
    <div
      data-ocid="freq.panel"
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
        SIGNAL TOOLS
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Frequency Generator */}
        <div
          className="rounded p-3 space-y-3"
          style={{ background: "#0d1527", border: "1px solid #1e3a6e" }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold tracking-wider"
              style={{ color: "#93c5fd" }}
            >
              FREQ GENERATOR
            </span>
            <Switch
              data-ocid="freq.switch"
              checked={freqActive}
              onCheckedChange={toggleFreq}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <Label style={{ color: "#64748b", fontSize: "10px" }}>
                FREQUENCY
              </Label>
              <span style={{ color: "#facc15" }}>
                {hz >= 1000 ? `${(hz / 1000).toFixed(1)}kHz` : `${hz}Hz`}
              </span>
            </div>
            <input
              data-ocid="freq.input"
              type="range"
              min="20"
              max="20000"
              step="10"
              value={hz}
              onChange={(e) => updateHz(Number.parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: "#3b82f6" }}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <Label style={{ color: "#64748b", fontSize: "10px" }}>
                LEVEL
              </Label>
              <span style={{ color: "#e2e8f0" }}>{freqLevel}%</span>
            </div>
            <input
              data-ocid="freq.level.input"
              type="range"
              min="0"
              max="100"
              value={freqLevel}
              onChange={(e) => updateLevel(Number.parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: "#3b82f6" }}
            />
          </div>
          <div
            className="text-xs text-center font-mono py-1 rounded"
            style={{
              background: freqActive ? "#14532d" : "#1c1917",
              color: freqActive ? "#22c55e" : "#475569",
            }}
          >
            {freqActive ? "GENERATING" : "STANDBY"}
          </div>
        </div>

        {/* Noise Gate */}
        <div
          className="rounded p-3 space-y-3"
          style={{ background: "#0d1527", border: "1px solid #1e3a6e" }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold tracking-wider"
              style={{ color: "#93c5fd" }}
            >
              NOISE GATE
            </span>
            <Switch
              data-ocid="noise.switch"
              checked={noiseGate}
              onCheckedChange={toggleNoise}
            />
          </div>
          <div className="py-4 flex flex-col items-center justify-center gap-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: noiseGate ? "#14532d" : "#1c1917",
                border: `2px solid ${noiseGate ? "#22c55e" : "#374151"}`,
                boxShadow: noiseGate ? "0 0 15px rgba(34,197,94,0.25)" : "none",
              }}
            >
              <span style={{ fontSize: "20px" }}>
                {noiseGate ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
              </span>
            </div>
            <span
              className="text-xs font-mono"
              style={{ color: noiseGate ? "#22c55e" : "#475569" }}
            >
              {noiseGate ? "BLOCKING NOISE" : "GATE OFF"}
            </span>
            <div
              className="text-xs font-mono text-center"
              style={{ color: "#64748b" }}
            >
              <div>Threshold: -50dB</div>
              <div>Ratio: 20:1</div>
            </div>
          </div>
        </div>

        {/* DB Boost */}
        <div
          className="rounded p-3 space-y-3"
          style={{ background: "#0d1527", border: "1px solid #1e3a6e" }}
        >
          <span
            className="text-xs font-bold tracking-wider"
            style={{ color: "#93c5fd" }}
          >
            DB BOOST
          </span>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color: "#64748b" }}>BOOST LEVEL</span>
              <span style={{ color: "#facc15" }}>{dbBoost}%</span>
            </div>
            <input
              data-ocid="dbboost.input"
              type="range"
              min="0"
              max="100"
              value={dbBoost}
              onChange={(e) => updateDbBoost(Number.parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: "#facc15" }}
            />
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "#1e3a6e" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${dbBoost}%`,
                  background: "linear-gradient(90deg, #1d4ed8, #facc15)",
                  transition: "width 0.1s linear",
                }}
              />
            </div>
            <div className="text-xs font-mono" style={{ color: "#64748b" }}>
              Gain: {(1.0 + (dbBoost / 100) * 2).toFixed(2)}x | Clean boost
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
