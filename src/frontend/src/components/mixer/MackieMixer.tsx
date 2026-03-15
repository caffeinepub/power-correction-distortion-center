import { useCallback, useEffect, useRef, useState } from "react";
import { RotaryKnob } from "./RotaryKnob";

interface ChannelState {
  id: string;
  aux: number;
  balance: number;
  pan: number;
  fader: number;
  muted: boolean;
}

const CHANNEL_IDS = Array.from({ length: 16 }, (_, i) => `channel-${i + 1}`);
const METER_SEGS = Array.from({ length: 20 }, (_, i) => `meter-seg-${i + 1}`);

export function MackieMixer() {
  const [channels, setChannels] = useState<ChannelState[]>(() =>
    CHANNEL_IDS.map((id) => ({
      id,
      aux: 50,
      balance: 50,
      pan: 50,
      fader: 80,
      muted: false,
    })),
  );
  const [masterL, setMasterL] = useState(80);
  const [masterR, setMasterR] = useState(80);
  const [mono, setMono] = useState(false);
  const [meterLevel, setMeterLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Animate meter
  useEffect(() => {
    const tick = () => {
      setMeterLevel((prev) => {
        const target = Math.random() * 80 + 10;
        return prev + (target - prev) * 0.15;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const updateChannel = useCallback(
    (id: string, key: keyof ChannelState, val: number | boolean) => {
      setChannels((prev) =>
        prev.map((ch) => (ch.id === id ? { ...ch, [key]: val } : ch)),
      );
    },
    [],
  );

  const meterSegments = 20;
  const activeSeg = Math.round((meterLevel / 100) * meterSegments);

  return (
    <div
      data-ocid="mixer.panel"
      className="rounded-lg p-5 space-y-4 w-full"
      style={{ background: "#0a0a0a", border: "2px solid #1e40af" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold tracking-widest"
          style={{
            color: "#facc15",
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          MACKIE LM3204 STEREO LINE MIXER
        </h3>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
          />
          <span className="text-xs font-mono" style={{ color: "#22c55e" }}>
            ACTIVE
          </span>
        </div>
      </div>

      {/* Scrollable channel strips */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "visible",
          maxWidth: "100%",
          paddingBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "6px",
            minWidth: "max-content",
            alignItems: "stretch",
          }}
        >
          {/* 16 channel strips */}
          {channels.map((ch, i) => (
            <div
              key={ch.id}
              data-ocid={`mixer.item.${i + 1}`}
              style={{
                width: "88px",
                background: ch.muted ? "#1a0505" : "#141414",
                border: `1px solid ${ch.muted ? "#7f1d1d" : "#2a2a2a"}`,
                borderRadius: "6px",
                padding: "8px 4px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                flexShrink: 0,
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              {/* Channel number */}
              <div
                style={{
                  fontSize: "10px",
                  color: ch.muted ? "#7f1d1d" : "#888",
                  fontFamily: "monospace",
                  fontWeight: "bold",
                  letterSpacing: "0.05em",
                }}
              >
                CH {i + 1}
              </div>

              {/* AUX knob */}
              <RotaryKnob
                value={ch.aux}
                onChange={(v) => updateChannel(ch.id, "aux", v)}
                color="#7f1d1d"
                indicatorColor="#f87171"
                label="AUX"
              />

              {/* BALANCE knob */}
              <RotaryKnob
                value={ch.balance}
                onChange={(v) => updateChannel(ch.id, "balance", v)}
                color="#1e3a6e"
                indicatorColor="#60a5fa"
                label="BAL"
              />

              {/* PAN knob */}
              <RotaryKnob
                value={ch.pan}
                onChange={(v) => updateChannel(ch.id, "pan", v)}
                color="#7f1d1d"
                indicatorColor="#f87171"
                label="PAN"
              />

              {/* Fader label */}
              <div
                style={{
                  fontSize: "9px",
                  color: "#555",
                  fontFamily: "monospace",
                }}
              >
                FADER
              </div>

              {/* Channel fader */}
              <div
                style={{
                  height: "90px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ch.fader}
                  onChange={(e) =>
                    updateChannel(
                      ch.id,
                      "fader",
                      Number.parseInt(e.target.value),
                    )
                  }
                  style={{
                    writingMode:
                      "vertical-lr" as React.CSSProperties["writingMode"],
                    direction: "rtl" as React.CSSProperties["direction"],
                    width: "24px",
                    height: "80px",
                    WebkitAppearance: "slider-vertical",
                    accentColor: ch.muted ? "#7f1d1d" : "#3b82f6",
                    opacity: ch.muted ? 0.4 : 1,
                    cursor: "pointer",
                  }}
                />
              </div>

              {/* Fader value */}
              <div
                style={{
                  fontSize: "9px",
                  color: ch.muted ? "#7f1d1d" : "#4b5563",
                  fontFamily: "monospace",
                }}
              >
                {ch.fader}
              </div>

              {/* Mute button */}
              <button
                type="button"
                data-ocid={`mixer.toggle.${i + 1}`}
                onClick={() => updateChannel(ch.id, "muted", !ch.muted)}
                style={{
                  width: "100%",
                  padding: "5px 0",
                  background: ch.muted ? "#7f1d1d" : "#1f2937",
                  border: `1px solid ${ch.muted ? "#ef4444" : "#374151"}`,
                  borderRadius: "3px",
                  color: ch.muted ? "#f87171" : "#6b7280",
                  fontSize: "9px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  transition: "all 0.15s",
                }}
              >
                {ch.muted ? "MUTED" : "MUTE"}
              </button>
            </div>
          ))}

          {/* Master section */}
          <div
            style={{
              width: "100px",
              background: "#0f0f0f",
              border: "2px solid #374151",
              borderRadius: "6px",
              padding: "8px 8px 10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
              marginLeft: "10px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#facc15",
                fontFamily: "monospace",
                fontWeight: "bold",
                letterSpacing: "0.12em",
              }}
            >
              MASTER
            </div>

            {/* Level Meter */}
            <div
              style={{
                display: "flex",
                gap: "3px",
                height: "130px",
                alignItems: "flex-end",
              }}
            >
              {METER_SEGS.map((segId, seg) => {
                const isActive = seg < activeSeg;
                const isRed = seg > meterSegments * 0.85;
                const isYellow = seg > meterSegments * 0.65;
                const segColor = isRed
                  ? "#ef4444"
                  : isYellow
                    ? "#f59e0b"
                    : "#22c55e";
                return (
                  <div
                    key={segId}
                    style={{
                      width: "12px",
                      height: `${(seg + 1) * (130 / meterSegments)}px`,
                      background: isActive ? segColor : "#1f2937",
                      borderRadius: "1px",
                      boxShadow: isActive ? `0 0 4px ${segColor}` : "none",
                      transition: "background 0.05s",
                    }}
                  />
                );
              })}
            </div>

            {/* L/R Master faders */}
            <div
              style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    color: "#60a5fa",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                  }}
                >
                  L
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterL}
                  onChange={(e) => setMasterL(Number.parseInt(e.target.value))}
                  style={{
                    writingMode:
                      "vertical-lr" as React.CSSProperties["writingMode"],
                    direction: "rtl" as React.CSSProperties["direction"],
                    width: "24px",
                    height: "80px",
                    WebkitAppearance: "slider-vertical",
                    accentColor: "#3b82f6",
                    cursor: "pointer",
                  }}
                />
                <span
                  style={{
                    fontSize: "9px",
                    color: "#4b5563",
                    fontFamily: "monospace",
                  }}
                >
                  {masterL}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    color: "#60a5fa",
                    fontFamily: "monospace",
                    fontWeight: "bold",
                  }}
                >
                  R
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterR}
                  onChange={(e) => setMasterR(Number.parseInt(e.target.value))}
                  style={{
                    writingMode:
                      "vertical-lr" as React.CSSProperties["writingMode"],
                    direction: "rtl" as React.CSSProperties["direction"],
                    width: "24px",
                    height: "80px",
                    WebkitAppearance: "slider-vertical",
                    accentColor: "#3b82f6",
                    cursor: "pointer",
                  }}
                />
                <span
                  style={{
                    fontSize: "9px",
                    color: "#4b5563",
                    fontFamily: "monospace",
                  }}
                >
                  {masterR}
                </span>
              </div>
            </div>

            {/* MONO button */}
            <button
              type="button"
              data-ocid="mixer.toggle"
              onClick={() => setMono((v) => !v)}
              style={{
                width: "100%",
                padding: "5px",
                background: mono ? "#1e3a6e" : "#1f2937",
                border: `1px solid ${mono ? "#3b82f6" : "#374151"}`,
                borderRadius: "3px",
                color: mono ? "#60a5fa" : "#6b7280",
                fontSize: "10px",
                fontWeight: "bold",
                cursor: "pointer",
                letterSpacing: "0.1em",
                transition: "all 0.15s",
              }}
            >
              MONO
            </button>
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div
        className="flex flex-wrap gap-4 text-xs font-mono"
        style={{ color: "#475569" }}
      >
        <span>16 CHANNELS</span>
        <span>•</span>
        <span>AUX / BAL / PAN per channel (drag up/down)</span>
        <span>•</span>
        <span>
          Master L: {masterL} / R: {masterR}
        </span>
        {mono && <span style={{ color: "#60a5fa" }}>• MONO MODE</span>}
      </div>
    </div>
  );
}
