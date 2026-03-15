import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { audioEngine } from "../audio/AudioEngine";

interface FreqNoisePanelProps {
  initialDbBoost?: number;
  initialNoiseGate?: boolean;
  onSettingsChange?: (s: {
    dbBoost: number;
    noiseGate: boolean;
    hz: number;
    freqLevel: number;
  }) => void;
}

export function FreqNoisePanel({
  initialDbBoost = 0,
  initialNoiseGate = false,
  onSettingsChange,
}: FreqNoisePanelProps) {
  const [noiseGate, setNoiseGate] = useState(initialNoiseGate);
  const [dbBoost, setDbBoost] = useState(initialDbBoost);

  // Apply restored settings to audio engine on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
  useEffect(() => {
    audioEngine.setDBBoost(initialDbBoost);
    audioEngine.toggleNoiseGate(initialNoiseGate);
  }, []);

  const notify = (
    updates: Partial<{
      dbBoost: number;
      noiseGate: boolean;
    }>,
  ) => {
    const next = { dbBoost, noiseGate, hz: 440, freqLevel: 50, ...updates };
    onSettingsChange?.(next);
  };

  const updateDbBoost = (val: number) => {
    setDbBoost(val);
    audioEngine.setDBBoost(val);
    notify({ dbBoost: val });
  };

  const toggleNoise = (on: boolean) => {
    setNoiseGate(on);
    audioEngine.toggleNoiseGate(on);
    notify({ noiseGate: on });
  };

  const gainValue = 1.0 + (dbBoost / 100) * 5.0;
  const boostHigh = dbBoost > 50;

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Noise Gate */}
        <div
          className="rounded p-3 space-y-3"
          style={{ background: "#0d1527", border: "1px solid #1e3a6e" }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-bold tracking-wider"
              style={{ color: "#3b82f6" }}
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
                background: noiseGate ? "#0d1b3e" : "#070e1f",
                border: `2px solid ${noiseGate ? "#3b82f6" : "#1e3a6e"}`,
                boxShadow: noiseGate
                  ? "0 0 15px rgba(59,130,246,0.25)"
                  : "none",
              }}
            >
              <span style={{ fontSize: "20px" }}>
                {noiseGate ? "🔇" : "🔊"}
              </span>
            </div>
            <span
              className="text-xs font-mono"
              style={{ color: noiseGate ? "#3b82f6" : "#1e3a6e" }}
            >
              {noiseGate ? "BLOCKING NOISE" : "GATE OFF"}
            </span>
            <div
              className="text-xs font-mono text-center"
              style={{ color: "#1e40af" }}
            >
              <div>Threshold: -50dB</div>
              <div>Ratio: 20:1</div>
            </div>
          </div>
        </div>

        {/* DB Boost */}
        <div
          className="rounded p-4 space-y-3"
          style={{
            background: "#0d1527",
            border: `2px solid ${boostHigh ? "#ef4444" : "#1e3a6e"}`,
            boxShadow: boostHigh ? "0 0 16px rgba(239,68,68,0.25)" : "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-sm font-black tracking-wider"
              style={{
                color: boostHigh ? "#ef4444" : "#3b82f6",
                letterSpacing: "0.15em",
              }}
            >
              DB BOOST
            </span>
            {boostHigh && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: "#7f1d1d",
                  color: "#ef4444",
                  border: "1px solid #ef4444",
                }}
              >
                HOT
              </span>
            )}
          </div>

          {/* Big gain readout */}
          <div
            className="text-center py-2 rounded"
            style={{
              background: "#05080f",
              border: `1px solid ${boostHigh ? "#ef4444" : "#1e3a6e"}`,
            }}
          >
            <div
              className="text-3xl font-black font-mono"
              style={{
                color: boostHigh ? "#ef4444" : "#facc15",
                lineHeight: 1,
              }}
            >
              {gainValue.toFixed(2)}x
            </div>
            <div
              className="text-xs font-mono mt-1"
              style={{ color: "#1e40af" }}
            >
              GAIN
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color: "#1e40af" }}>BOOST LEVEL</span>
              <span style={{ color: boostHigh ? "#ef4444" : "#facc15" }}>
                {dbBoost}%
              </span>
            </div>
            <input
              data-ocid="dbboost.input"
              type="range"
              min="0"
              max="100"
              value={dbBoost}
              onChange={(e) => updateDbBoost(Number.parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: boostHigh ? "#ef4444" : "#facc15" }}
            />
            {/* Visual indicator bar -- RED when above 50% */}
            <div
              className="h-3 rounded-full overflow-hidden"
              style={{ background: "#1e3a6e" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${dbBoost}%`,
                  background: boostHigh
                    ? "linear-gradient(90deg, #1d4ed8, #ef4444)"
                    : "linear-gradient(90deg, #1d4ed8, #facc15)",
                  boxShadow: boostHigh ? "0 0 8px #ef4444" : "none",
                  transition: "width 0.1s linear, background 0.2s",
                }}
              />
            </div>
            <div className="text-xs font-mono" style={{ color: "#1e40af" }}>
              Gain: {gainValue.toFixed(2)}x | Crystal clear boost | 6x max
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
