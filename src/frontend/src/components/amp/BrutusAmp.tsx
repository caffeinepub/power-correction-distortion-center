import { useEffect, useRef, useState } from "react";
import { AudioEngine, audioEngine } from "../../audio/AudioEngine";

interface BrutusAmpProps {
  powered: boolean;
  powerLevel?: number;
  onPowerLevel?: (level: number) => void;
  rockBassDrop?: boolean;
  onRockBassDrop?: (on: boolean) => void;
  loudnessSafetyExtreme?: boolean;
  onLoudnessSafetyExtreme?: (on: boolean) => void;
}

export function BrutusAmp({
  powered,
  powerLevel = 100,
  onPowerLevel,
  rockBassDrop = false,
  onRockBassDrop,
  loudnessSafetyExtreme = false,
  onLoudnessSafetyExtreme,
}: BrutusAmpProps) {
  const [headroomActive, setHeadroomActive] = useState(false);
  const headroomTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wire real ampGain node with power regulation
  useEffect(() => {
    audioEngine.setAmpPower(powered);
  }, [powered]);

  // Apply user power level to the engine whenever it changes
  useEffect(() => {
    if (powered) {
      audioEngine.setUserPowerLevel(powerLevel);
    }
  }, [powered, powerLevel]);

  // Poll headroom indicator
  useEffect(() => {
    if (!powered) {
      setHeadroomActive(false);
      if (headroomTimer.current) clearInterval(headroomTimer.current);
      return;
    }
    headroomTimer.current = setInterval(() => {
      const dbfs = audioEngine.getDBFS();
      setHeadroomActive(dbfs > -100 && dbfs < -30);
    }, 300);
    return () => {
      if (headroomTimer.current) clearInterval(headroomTimer.current);
    };
  }, [powered]);

  // Wire rock bass drop toggle to the audio engine
  const handleRockBassDrop = (on: boolean) => {
    audioEngine.setRockBassDrop(on);
    onRockBassDrop?.(on);
  };

  // Wire loudness safety extreme toggle to the audio engine
  const handleLoudnessSafetyExtreme = (on: boolean) => {
    audioEngine.setLoudnessSafetyExtreme(on);
    onLoudnessSafetyExtreme?.(on);
  };

  const wattsDelivered = Math.round(
    (powerLevel / 100) * AudioEngine.POWER_WATTS,
  );
  const spec = audioEngine.getPowerSpec();

  return (
    <div
      data-ocid="amp.panel"
      className="rounded-lg overflow-hidden w-full"
      style={{
        background:
          "linear-gradient(180deg, #d1d5db 0%, #9ca3af 25%, #6b7280 50%, #9ca3af 75%, #d1d5db 100%)",
        border: loudnessSafetyExtreme
          ? "3px solid #ef4444"
          : powered
            ? "3px solid #3b82f6"
            : "3px solid #374151",
        boxShadow: loudnessSafetyExtreme
          ? "0 0 50px rgba(239,68,68,0.6), 0 0 100px rgba(185,28,28,0.3)"
          : powered
            ? "0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(29,78,216,0.2)"
            : "0 4px 20px rgba(0,0,0,0.5)",
        transition: "box-shadow 0.4s ease, border-color 0.4s ease",
        position: "relative",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background:
            "repeating-linear-gradient(180deg, transparent 0px, transparent 6px, rgba(0,0,0,0.3) 6px, rgba(0,0,0,0.3) 8px)",
        }}
      />

      {/* Header bar */}
      <div
        className="relative z-10 flex items-center justify-between px-6 py-2"
        style={{ background: "linear-gradient(180deg, #111827, #1f2937)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="px-4 py-1 rounded font-black tracking-widest text-xl"
            style={{
              background: "linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)",
              color: "#1c1917",
              fontFamily: "'Bricolage Grotesque', sans-serif",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            BRUTUS
          </div>
          <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
            SERIES
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
            12-SOURCE POWER
          </span>
          <div
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{
              background: "#1e3a6e",
              color: "#93c5fd",
              border: "1px solid #3b82f6",
            }}
          >
            MULTI-SRC
          </div>
        </div>
      </div>

      {/* Main amp body */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5">
        {/* Left channel indicators */}
        <div className="flex flex-col gap-3">
          {([0, 1, 2, 3] as const).map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: powered
                    ? loudnessSafetyExtreme
                      ? "#ef4444"
                      : headroomActive
                        ? "#facc15"
                        : "#3b82f6"
                    : "#1e3a6e",
                  boxShadow: powered
                    ? loudnessSafetyExtreme
                      ? "0 0 10px #ef4444, 0 0 20px #b91c1c"
                      : headroomActive
                        ? "0 0 8px #facc15, 0 0 16px #d97706"
                        : "0 0 8px #3b82f6, 0 0 16px #1d4ed8"
                    : "none",
                  transition: "all 0.3s ease",
                }}
              />
              <span
                style={{
                  fontSize: "8px",
                  fontFamily: "monospace",
                  color: powered ? "#6b7280" : "#374151",
                  letterSpacing: "0.05em",
                }}
              >
                CH{i + 1}
              </span>
            </div>
          ))}
        </div>

        {/* Center display */}
        <div className="text-center flex-1 mx-8">
          <div
            className="font-black text-5xl tracking-widest leading-none"
            style={{
              color: powered ? "#111827" : "#374151",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            SRS2202
          </div>
          <div
            className="font-bold text-xl tracking-widest mt-1"
            style={{
              color: loudnessSafetyExtreme
                ? "#ef4444"
                : powered
                  ? "#1d4ed8"
                  : "#374151",
              fontFamily: "'Bricolage Grotesque', sans-serif",
              transition: "color 0.3s ease",
            }}
          >
            DB AMPLIFIER
          </div>
          <div
            className="font-semibold text-sm tracking-widest mt-0.5"
            style={{ color: powered ? "#374151" : "#4b5563" }}
          >
            GP / AUDIO DESIGNER
          </div>
          <div
            className="mt-3 text-xs font-mono"
            style={{ color: powered ? "#1d4ed8" : "#6b7280" }}
          >
            60,000,000W SAFT | 0 GAUGE WIRE
          </div>

          {/* Power spec */}
          <div
            className="mt-1 text-xs font-mono"
            style={{ color: powered ? "#3b82f6" : "#374151" }}
          >
            {spec.totalWatts.toLocaleString()}W / {spec.channels}CH | HEADROOM{" "}
            {spec.headroomWatts.toLocaleString()}W
          </div>

          {/* SAFT MODE badge */}
          {powered && (
            <div
              className="mt-2 mx-auto inline-block px-3 py-1 rounded text-xs font-bold tracking-widest"
              style={{
                background: loudnessSafetyExtreme ? "#7f1d1d" : "#1e3a6e",
                color: loudnessSafetyExtreme ? "#fca5a5" : "#93c5fd",
                border: loudnessSafetyExtreme
                  ? "1px solid #ef4444"
                  : "1px solid #3b82f6",
                boxShadow: loudnessSafetyExtreme
                  ? "0 0 12px rgba(239,68,68,0.5)"
                  : "0 0 8px rgba(59,130,246,0.4)",
                letterSpacing: "0.1em",
                transition: "all 0.3s ease",
              }}
            >
              {loudnessSafetyExtreme
                ? "EXTREME MODE — MAX LOUD / ZERO DISTORTION"
                : "SAFT MODE ACTIVE — REGULATED 120 dB CEILING"}
            </div>
          )}

          {/* Headroom indicator */}
          {powered && headroomActive && !loudnessSafetyExtreme && (
            <div
              className="mt-1 mx-auto inline-block px-3 py-1 rounded text-xs font-bold tracking-widest"
              style={{
                background: "#451a03",
                color: "#facc15",
                border: "1px solid #d97706",
                boxShadow: "0 0 8px rgba(250,204,21,0.4)",
                letterSpacing: "0.1em",
              }}
            >
              HEADROOM ACTIVE ▲
            </div>
          )}

          {/* 4 fuse visuals */}
          <div className="mt-4 flex flex-col items-center gap-1">
            <div
              className="text-xs font-mono mb-1"
              style={{
                color: powered ? "#9ca3af" : "#4b5563",
                letterSpacing: "0.15em",
              }}
            >
              FUSES
            </div>
            <div className="flex gap-2">
              {([0, 1, 2, 3] as const).map((fi) => (
                <div key={fi} className="flex flex-col items-center gap-0.5">
                  <div
                    style={{
                      width: "48px",
                      height: "20px",
                      background: powered
                        ? "linear-gradient(180deg, #7f1d1d, #b91c1c)"
                        : "linear-gradient(180deg, #1f2937, #374151)",
                      border: powered
                        ? "1px solid #f87171"
                        : "1px solid #4b5563",
                      borderRadius: "3px",
                      position: "relative",
                      boxShadow: powered
                        ? loudnessSafetyExtreme
                          ? "0 0 12px rgba(239,68,68,0.9)"
                          : "0 0 8px rgba(239,68,68,0.6)"
                        : "none",
                      transition: "all 0.4s ease",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "6px",
                        right: "6px",
                        height: "2px",
                        marginTop: "-1px",
                        background: powered ? "#fca5a5" : "#6b7280",
                        borderRadius: "1px",
                        boxShadow: powered ? "0 0 4px #ef4444" : "none",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-mono font-bold"
                    style={{
                      color: powered ? "#f87171" : "#6b7280",
                      fontSize: "8px",
                    }}
                  >
                    120W
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right channel indicators */}
        <div className="flex flex-col gap-3">
          {([0, 1, 2, 3] as const).map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span
                style={{
                  fontSize: "8px",
                  fontFamily: "monospace",
                  color: powered ? "#6b7280" : "#374151",
                  letterSpacing: "0.05em",
                }}
              >
                CH{i + 1}
              </span>
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: powered
                    ? loudnessSafetyExtreme
                      ? "#ef4444"
                      : headroomActive
                        ? "#facc15"
                        : "#3b82f6"
                    : "#1e3a6e",
                  boxShadow: powered
                    ? loudnessSafetyExtreme
                      ? "0 0 10px #ef4444, 0 0 20px #b91c1c"
                      : headroomActive
                        ? "0 0 8px #facc15, 0 0 16px #d97706"
                        : "0 0 8px #3b82f6, 0 0 16px #1d4ed8"
                    : "none",
                  transition: "all 0.3s ease",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ─── LOUDNESS SAFETY EXTREME TOGGLE ─── */}
      <div
        className="relative z-10 px-8 py-4"
        style={{
          background: loudnessSafetyExtreme
            ? "linear-gradient(90deg, rgba(127,29,29,0.7), rgba(185,28,28,0.3), rgba(127,29,29,0.7))"
            : "linear-gradient(90deg, rgba(10,15,30,0.95), rgba(15,23,42,0.9))",
          borderTop: loudnessSafetyExtreme
            ? "2px solid #ef4444"
            : "2px solid #1e3a6e",
          borderBottom: "1px solid #1e3a6e",
          transition: "background 0.4s ease, border-color 0.4s ease",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Label */}
          <div className="flex flex-col gap-1">
            <span
              className="text-sm font-black tracking-widest font-mono"
              style={{
                color: loudnessSafetyExtreme ? "#ef4444" : "#3b82f6",
                textShadow: loudnessSafetyExtreme
                  ? "0 0 14px rgba(239,68,68,0.8), 0 0 28px rgba(239,68,68,0.4)"
                  : "none",
                transition: "color 0.3s ease, text-shadow 0.3s ease",
                letterSpacing: "0.1em",
              }}
            >
              LOUDNESS SAFETY EXTREME
            </span>
            <span
              className="text-xs font-mono font-bold"
              style={{
                color: loudnessSafetyExtreme ? "#fca5a5" : "#1d4ed8",
                letterSpacing: "0.15em",
                fontSize: "10px",
                transition: "color 0.3s ease",
              }}
            >
              MAX LOUD · ZERO DISTORTION · SUPER CLEAN
            </span>
          </div>

          {/* Status badge + toggle */}
          <div className="flex items-center gap-4">
            {/* Status badge */}
            <div
              className="px-3 py-1 rounded text-xs font-bold tracking-widest font-mono"
              style={{
                background: loudnessSafetyExtreme ? "#7f1d1d" : "#050d1a",
                color: loudnessSafetyExtreme ? "#fca5a5" : "#1d4ed8",
                border: loudnessSafetyExtreme
                  ? "1px solid #ef4444"
                  : "1px solid #1e3a6e",
                boxShadow: loudnessSafetyExtreme
                  ? "0 0 14px rgba(239,68,68,0.6), 0 0 28px rgba(185,28,28,0.3)"
                  : "none",
                transition: "all 0.3s ease",
                minWidth: "110px",
                textAlign: "center",
              }}
            >
              {loudnessSafetyExtreme ? "EXTREME ACTIVE" : "STANDBY"}
            </div>

            {/* Toggle switch */}
            <button
              data-ocid="amp.toggle"
              type="button"
              onClick={() =>
                handleLoudnessSafetyExtreme(!loudnessSafetyExtreme)
              }
              disabled={!powered}
              aria-pressed={loudnessSafetyExtreme}
              aria-label="Loudness Safety Extreme"
              style={{
                width: "56px",
                height: "28px",
                borderRadius: "14px",
                border: loudnessSafetyExtreme
                  ? "2px solid #ef4444"
                  : "2px solid #3b82f6",
                background: loudnessSafetyExtreme
                  ? "linear-gradient(90deg, #7f1d1d, #b91c1c)"
                  : "linear-gradient(90deg, #1e3a6e, #1d4ed8)",
                position: "relative",
                cursor: powered ? "pointer" : "not-allowed",
                opacity: powered ? 1 : 0.35,
                transition: "all 0.3s ease",
                boxShadow: loudnessSafetyExtreme
                  ? "0 0 16px rgba(239,68,68,0.7), inset 0 1px 2px rgba(0,0,0,0.3)"
                  : "0 0 8px rgba(59,130,246,0.4), inset 0 1px 2px rgba(0,0,0,0.3)",
                flexShrink: 0,
              }}
            >
              {/* Thumb */}
              <div
                style={{
                  position: "absolute",
                  top: "3px",
                  left: loudnessSafetyExtreme ? "29px" : "3px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: loudnessSafetyExtreme
                    ? "linear-gradient(135deg, #fca5a5, #ef4444)"
                    : "linear-gradient(135deg, #93c5fd, #3b82f6)",
                  boxShadow: loudnessSafetyExtreme
                    ? "0 0 8px #ef4444"
                    : "0 0 6px #3b82f6",
                  transition:
                    "left 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
                }}
              />
            </button>
          </div>
        </div>

        {/* Extreme active pulse bar */}
        {loudnessSafetyExtreme && (
          <div
            className="mt-3 w-full rounded"
            style={{
              height: "4px",
              background:
                "linear-gradient(90deg, transparent, #ef4444, #dc2626, #b91c1c, #dc2626, #ef4444, transparent)",
              boxShadow:
                "0 0 14px rgba(239,68,68,0.9), 0 0 28px rgba(185,28,28,0.5)",
              animation: "extremePulse 0.8s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* ─── ROCK CONCERT BASS / CAR DROP 80 Hz TOGGLE ─── */}
      <div
        className="relative z-10 px-8 py-4"
        style={{
          background: rockBassDrop
            ? "linear-gradient(90deg, rgba(127,29,29,0.5), rgba(30,10,10,0.8))"
            : "linear-gradient(90deg, rgba(15,23,42,0.8), rgba(10,15,30,0.9))",
          borderTop: "1px solid #1e3a6e",
          borderBottom: "1px solid #1e3a6e",
          transition: "background 0.4s ease",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Label */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-xs font-black tracking-widest font-mono"
              style={{
                color: rockBassDrop ? "#ef4444" : "#3b82f6",
                textShadow: rockBassDrop
                  ? "0 0 10px rgba(239,68,68,0.6)"
                  : "none",
                transition: "color 0.3s ease, text-shadow 0.3s ease",
                letterSpacing: "0.12em",
              }}
            >
              ROCK CONCERT BASS / CAR DROP 80 HZ
            </span>
            <span
              className="text-xs font-mono"
              style={{
                color: rockBassDrop ? "#fca5a5" : "#475569",
                fontSize: "10px",
              }}
            >
              80 Hz peaking filter • +10 dB • Q 2.5
            </span>
          </div>

          {/* Status badge + toggle */}
          <div className="flex items-center gap-4">
            <div
              className="px-3 py-1 rounded text-xs font-bold tracking-widest font-mono"
              style={{
                background: rockBassDrop ? "#7f1d1d" : "#0f172a",
                color: rockBassDrop ? "#fca5a5" : "#475569",
                border: rockBassDrop
                  ? "1px solid #ef4444"
                  : "1px solid #1e3a6e",
                boxShadow: rockBassDrop
                  ? "0 0 10px rgba(239,68,68,0.5)"
                  : "none",
                transition: "all 0.3s ease",
                minWidth: "90px",
                textAlign: "center",
              }}
            >
              {rockBassDrop ? "DROP ACTIVE" : "STANDBY"}
            </div>

            <button
              data-ocid="amp.secondary_button"
              type="button"
              onClick={() => handleRockBassDrop(!rockBassDrop)}
              disabled={!powered}
              aria-pressed={rockBassDrop}
              aria-label="Rock Concert Bass / Car Drop 80 Hz"
              style={{
                width: "56px",
                height: "28px",
                borderRadius: "14px",
                border: rockBassDrop
                  ? "2px solid #ef4444"
                  : "2px solid #3b82f6",
                background: rockBassDrop
                  ? "linear-gradient(90deg, #7f1d1d, #b91c1c)"
                  : "linear-gradient(90deg, #1e3a6e, #1d4ed8)",
                position: "relative",
                cursor: powered ? "pointer" : "not-allowed",
                opacity: powered ? 1 : 0.35,
                transition: "all 0.3s ease",
                boxShadow: rockBassDrop
                  ? "0 0 12px rgba(239,68,68,0.6), inset 0 1px 2px rgba(0,0,0,0.3)"
                  : "0 0 8px rgba(59,130,246,0.4), inset 0 1px 2px rgba(0,0,0,0.3)",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "3px",
                  left: rockBassDrop ? "29px" : "3px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: rockBassDrop
                    ? "linear-gradient(135deg, #fca5a5, #ef4444)"
                    : "linear-gradient(135deg, #93c5fd, #3b82f6)",
                  boxShadow: rockBassDrop
                    ? "0 0 6px #ef4444"
                    : "0 0 6px #3b82f6",
                  transition:
                    "left 0.25s ease, background 0.25s ease, box-shadow 0.25s ease",
                }}
              />
            </button>
          </div>
        </div>

        {rockBassDrop && (
          <div
            className="mt-3 w-full rounded"
            style={{
              height: "3px",
              background:
                "linear-gradient(90deg, transparent, #ef4444, #dc2626, #ef4444, transparent)",
              boxShadow: "0 0 10px rgba(239,68,68,0.8)",
              animation: "bassDropPulse 1s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* ─── POWER SETTINGS SLIDER ─── */}
      <div
        className="relative z-10 px-8 pb-4"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(0,0,30,0.6))",
          borderTop: "1px solid #1e3a6e",
          paddingTop: "12px",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs font-bold tracking-widest font-mono"
            style={{ color: "#facc15" }}
          >
            POWER SETTINGS
          </span>
          <div className="flex items-center gap-3">
            <span
              className="text-xs font-mono font-bold"
              style={{
                color:
                  powerLevel > 80
                    ? "#ef4444"
                    : powerLevel > 50
                      ? "#facc15"
                      : "#3b82f6",
              }}
            >
              {wattsDelivered.toLocaleString()}W
            </span>
            <span className="text-xs font-mono" style={{ color: "#475569" }}>
              / {spec.totalWatts.toLocaleString()}W
            </span>
          </div>
        </div>
        <input
          data-ocid="amp.input"
          type="range"
          min="0"
          max="100"
          step="1"
          value={powerLevel}
          onChange={(e) => onPowerLevel?.(Number(e.target.value))}
          disabled={!powered}
          className="w-full"
          style={{
            accentColor:
              powerLevel > 80
                ? "#ef4444"
                : powerLevel > 50
                  ? "#facc15"
                  : "#3b82f6",
            height: "10px",
            opacity: powered ? 1 : 0.3,
            cursor: powered ? "pointer" : "not-allowed",
          }}
        />
        <div
          className="flex justify-between text-xs font-mono mt-1"
          style={{ color: "#374151" }}
        >
          <span>0W — SAFE</span>
          <span style={{ color: "#3b82f6" }}>SAFT MODE</span>
          <span style={{ color: "#ef4444" }}>MAX POWER</span>
        </div>
      </div>

      {/* 0-gauge wire visual */}
      <div
        className="relative z-10 px-6 pb-4"
        style={{ background: "linear-gradient(180deg, transparent, #0f172a)" }}
      >
        <div
          className="text-xs font-mono mb-1 text-center"
          style={{
            color: powered ? "#6b7280" : "#374151",
            letterSpacing: "0.12em",
          }}
        >
          0 GAUGE WIRE
        </div>
        <div
          style={{
            height: "12px",
            width: "100%",
            background: "#1a1a1a",
            border: "1px solid #374151",
            borderRadius: "6px",
            overflow: "hidden",
            boxShadow: powered
              ? loudnessSafetyExtreme
                ? "0 0 14px rgba(239,68,68,0.6), 0 0 28px rgba(185,28,28,0.3)"
                : "0 0 10px rgba(59,130,246,0.5), 0 0 20px rgba(29,78,216,0.2)"
              : "none",
            transition: "box-shadow 0.4s ease",
            position: "relative",
          }}
        >
          {powered && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: loudnessSafetyExtreme ? "100%" : `${powerLevel}%`,
                background: loudnessSafetyExtreme
                  ? "linear-gradient(90deg, #1d4ed8, #ef4444, #dc2626)"
                  : powerLevel > 80
                    ? "linear-gradient(90deg, #1d4ed8, #ef4444)"
                    : "linear-gradient(90deg, #1d4ed8, #3b82f6)",
                borderRadius: "6px",
                transition: "width 0.3s ease, background 0.3s ease",
                boxShadow: loudnessSafetyExtreme
                  ? "0 0 12px #ef4444"
                  : powerLevel > 80
                    ? "0 0 8px #ef4444"
                    : "0 0 8px #3b82f6",
              }}
            />
          )}
        </div>
      </div>

      {/* Status bar */}
      <div
        className="relative z-10 flex items-center justify-between px-8 py-4"
        style={{ background: "#0f172a", borderTop: "2px solid #1f2937" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{
              background: powered ? "#22c55e" : "#ef4444",
              boxShadow: powered ? "0 0 10px #22c55e" : "0 0 6px #ef4444",
              transition: "all 0.4s ease",
            }}
          />
          <span
            className="text-xs font-mono"
            style={{ color: powered ? "#22c55e" : "#ef4444" }}
          >
            {powered ? "POWER ON" : "POWER OFF"}
          </span>
        </div>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{
            background: "radial-gradient(circle at 35% 35%, #1e3a6e, #0d1527)",
            boxShadow: powered
              ? loudnessSafetyExtreme
                ? "0 0 24px #ef4444, 0 0 48px rgba(185,28,28,0.4), inset 0 2px 4px rgba(255,255,255,0.1)"
                : "0 0 20px #3b82f6, 0 0 40px rgba(29,78,216,0.25), inset 0 2px 4px rgba(255,255,255,0.1)"
              : "0 0 8px #1e3a6e",
            border: loudnessSafetyExtreme
              ? "2px solid #ef4444"
              : "2px solid #3b82f6",
            transition: "all 0.4s ease",
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: powered
                ? loudnessSafetyExtreme
                  ? "#ef4444"
                  : "#60a5fa"
                : "#1e3a6e",
              boxShadow: powered
                ? loudnessSafetyExtreme
                  ? "0 0 8px #ef4444"
                  : "0 0 6px #60a5fa"
                : "none",
            }}
          />
        </div>
        <div className="text-xs font-mono" style={{ color: "#475569" }}>
          SRS-2202
        </div>
      </div>

      {/* Ambient glow overlay */}
      {powered && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            boxShadow: loudnessSafetyExtreme
              ? "inset 0 0 40px rgba(239,68,68,0.12)"
              : "inset 0 0 30px rgba(59,130,246,0.15)",
            animation: loudnessSafetyExtreme
              ? "extremePulse 0.8s ease-in-out infinite"
              : "ampPulse 2s ease-in-out infinite",
          }}
        />
      )}
      <style>
        {`
          @keyframes ampPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
          @keyframes bassDropPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes extremePulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        `}
      </style>
    </div>
  );
}
