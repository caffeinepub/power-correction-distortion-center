import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { AudioEngine, audioEngine } from "../audio/AudioEngine";

const SMOOTH_JAZZ = [3, 4, 2, 1, 0, 2, 3, 2, 1, 0];

export function Equalizer() {
  const [bands, setBands] = useState<number[]>(new Array(10).fill(0));
  const [eqOn, setEqOn] = useState(true);
  const [blendVal, setBlendVal] = useState(50);
  const [spaceVal, setSpaceVal] = useState(50);

  const setBand = (i: number, val: number) => {
    const next = [...bands];
    next[i] = val;
    setBands(next);
    if (eqOn) audioEngine.setEQBand(i, val);
  };

  const applyPreset = (values: number[]) => {
    setBands([...values]);
    for (let i = 0; i < values.length; i++) audioEngine.setEQBand(i, values[i]);
  };

  const boostRange = (indices: number[]) => {
    const next = [...bands];
    for (const i of indices) next[i] = Math.min(12, next[i] + 3);
    setBands(next);
    for (const i of indices) audioEngine.setEQBand(i, next[i]);
  };

  const toggleEQ = (on: boolean) => {
    setEqOn(on);
    if (!on) {
      for (let i = 0; i < bands.length; i++) audioEngine.setEQBand(i, 0);
    } else {
      for (let i = 0; i < bands.length; i++) audioEngine.setEQBand(i, bands[i]);
    }
  };

  return (
    <div
      data-ocid="eq.panel"
      className="rounded-lg p-5 space-y-4"
      style={{ background: "#0a0f1e", border: "2px solid #1e40af" }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold tracking-widest"
          style={{
            color: "#facc15",
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          EQUALIZER
        </h3>
        <div className="flex items-center gap-3">
          <Switch
            data-ocid="eq.switch"
            checked={eqOn}
            onCheckedChange={toggleEQ}
          />
          <Label
            className="text-xs font-mono"
            style={{ color: eqOn ? "#facc15" : "#64748b" }}
          >
            EQ {eqOn ? "ON" : "OFF"}
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          {
            label: "SMOOTH JAZZ",
            action: () => applyPreset(SMOOTH_JAZZ),
            ocid: "eq.primary_button",
          },
          {
            label: "HIGHS +3",
            action: () => boostRange([7, 8, 9]),
            ocid: "eq.secondary_button",
          },
          {
            label: "MIDS +3",
            action: () => boostRange([3, 4, 5]),
            ocid: "eq.button",
          },
          {
            label: "LOUDNESS +3",
            action: () => boostRange([0, 1, 2]),
            ocid: "eq.toggle",
          },
          {
            label: "RESET",
            action: () => applyPreset(new Array(10).fill(0)),
            ocid: "eq.cancel_button",
          },
        ].map(({ label, action, ocid }) => (
          <Button
            key={label}
            data-ocid={ocid}
            type="button"
            size="sm"
            onClick={action}
            style={{
              background: "#1e3a6e",
              color: "#facc15",
              border: "1px solid #3b82f6",
              fontSize: "10px",
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      <div
        className="flex gap-1 items-end justify-between px-1"
        style={{ overflowX: "auto" }}
      >
        {AudioEngine.EQ_LABELS.map((label, i) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1"
            style={{ minWidth: "52px" }}
          >
            <span
              className="text-xs font-mono text-center"
              style={{
                color:
                  bands[i] > 0
                    ? "#22c55e"
                    : bands[i] < 0
                      ? "#ef4444"
                      : "#64748b",
                fontSize: "11px",
                minHeight: "16px",
              }}
            >
              {bands[i] > 0 ? `+${bands[i]}` : bands[i]}
            </span>
            <div
              style={{
                height: "120px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={bands[i]}
                onChange={(e) => setBand(i, Number.parseFloat(e.target.value))}
                disabled={!eqOn}
                style={{
                  writingMode:
                    "vertical-lr" as React.CSSProperties["writingMode"],
                  direction: "rtl" as React.CSSProperties["direction"],
                  width: "28px",
                  height: "110px",
                  cursor: eqOn ? "pointer" : "not-allowed",
                  accentColor:
                    bands[i] > 0
                      ? "#22c55e"
                      : bands[i] < 0
                        ? "#ef4444"
                        : "#3b82f6",
                  opacity: eqOn ? 1 : 0.4,
                  WebkitAppearance: "slider-vertical",
                }}
              />
            </div>
            <span
              className="text-center font-bold"
              style={{
                color: "#93c5fd",
                fontSize: "9px",
                letterSpacing: "0.03em",
                lineHeight: "1.1",
              }}
            >
              {label}
            </span>
            <span
              className="text-center font-mono"
              style={{ color: "#64748b", fontSize: "8px" }}
            >
              {AudioEngine.EQ_BANDS[i] >= 1000
                ? `${AudioEngine.EQ_BANDS[i] / 1000}k`
                : `${AudioEngine.EQ_BANDS[i]}`}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["EQ-CMD", "EQ-GAIN", "EQ-MON"].map((label) => (
          <div
            key={label}
            className="flex flex-col items-center py-2 rounded"
            style={{ background: "#05080f", border: "1px solid #1e3a6e" }}
          >
            <span className="text-xs font-bold" style={{ color: "#93c5fd" }}>
              {label}
            </span>
            <span className="text-xs font-mono" style={{ color: "#facc15" }}>
              1,953,000,000
            </span>
            <span className="text-xs" style={{ color: "#22c55e" }}>
              ACTIVE
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "BLEND", val: blendVal, set: setBlendVal },
          { label: "SPACE", val: spaceVal, set: setSpaceVal },
        ].map(({ label, val, set }) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <Label style={{ color: "#facc15", fontSize: "10px" }}>
                {label}
              </Label>
              <span style={{ color: "#e2e8f0" }}>{val}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={val}
              onChange={(e) => set(Number.parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: "#3b82f6" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
