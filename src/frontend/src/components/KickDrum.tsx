import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../audio/AudioEngine";

const LS_KEY = "kickdrum_drop80";
const LS_THUMP = "kickdrum_thump60";
const LS_KICK100 = "kickdrum_kick100";

interface KickDrumProps {
  onThump?: (val: number) => void;
  onKick100?: (val: number) => void;
}

export function KickDrum({ onThump, onKick100 }: KickDrumProps = {}) {
  const [isHit, setIsHit] = useState(false);
  const [drop80, setDrop80] = useState<number>(() => {
    const saved = localStorage.getItem(LS_KEY);
    return saved !== null ? Number(saved) : 0;
  });
  const [thump60, setThump60] = useState<number>(() => {
    const saved = localStorage.getItem(LS_THUMP);
    return saved !== null ? Number(saved) : 0;
  });
  const [kick100, setKick100] = useState<number>(() => {
    const saved = localStorage.getItem(LS_KICK100);
    return saved !== null ? Number(saved) : 0;
  });
  const hitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
  useEffect(() => {
    if (drop80 !== 0) audioEngine.set80HzDrop(drop80);
    if (thump60 !== 0) onThump?.(thump60);
    if (kick100 !== 0) onKick100?.(kick100);
  }, []);

  function fireKick() {
    const eng = (window as any).__audioEngine ?? audioEngine;
    let ctx: AudioContext | null = eng?.context ?? null;
    let dest: AudioNode | null = eng?.destination ?? null;

    if (!ctx) {
      ctx = new AudioContext();
      dest = ctx.destination;
    }

    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    oscGain.gain.setValueAtTime(1.0, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(oscGain);
    oscGain.connect(dest ?? ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);

    const bufSize = ctx.sampleRate * 0.02;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(noiseGain);
    noiseGain.connect(dest ?? ctx.destination);
    noise.start(now);

    setIsHit(true);
    if (hitTimeout.current) clearTimeout(hitTimeout.current);
    hitTimeout.current = setTimeout(() => setIsHit(false), 120);
  }

  function handle80HzDrop(val: number) {
    setDrop80(val);
    localStorage.setItem(LS_KEY, String(val));
    audioEngine.set80HzDrop(val);
  }

  function handleThump60(val: number) {
    setThump60(val);
    localStorage.setItem(LS_THUMP, String(val));
    onThump?.(val);
  }

  function handleKick100(val: number) {
    setKick100(val);
    localStorage.setItem(LS_KICK100, String(val));
    onKick100?.(val);
  }

  const dropDbNum = -((drop80 / 100) * 18);
  const dropDbDisplay = drop80 === 0 ? "FLAT" : `${dropDbNum.toFixed(1)} dB`;

  const sliderBox = (
    label: string,
    sublabel: string,
    val: number,
    min: number,
    max: number,
    ocid: string,
    onChange: (v: number) => void,
    displayVal: string,
    isHot: boolean,
  ) => (
    <div
      className="rounded p-4 space-y-3"
      style={{ background: "#060c1a", border: "1px solid #1e3a6e" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span
            className="text-xs font-bold tracking-widest"
            style={{
              color: isHot ? "#ef4444" : "#3b82f6",
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            {label}
          </span>
          <div
            className="text-xs font-mono mt-0.5"
            style={{ color: "#475569" }}
          >
            {sublabel}
          </div>
        </div>
        <span
          className="text-sm font-bold font-mono"
          style={{ color: isHot ? "#ef4444" : "#3b82f6" }}
        >
          {displayVal}
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
        style={{ accentColor: isHot ? "#ef4444" : "#3b82f6", height: "8px" }}
      />
      <div
        className="flex justify-between text-xs font-mono"
        style={{ color: "#334155" }}
      >
        <span>{min} dB</span>
        <span>FLAT (0)</span>
        <span>+{max} dB</span>
      </div>
    </div>
  );

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
        KICK DRUM
      </h3>

      <div className="flex flex-wrap items-center gap-8">
        <button
          data-ocid="kickdrum.primary_button"
          type="button"
          onMouseDown={fireKick}
          onTouchStart={(e) => {
            e.preventDefault();
            fireKick();
          }}
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: isHit
              ? "radial-gradient(circle, #ef4444 0%, #7c2d12 60%, #1e0a0a 100%)"
              : "radial-gradient(circle, #1e40af 0%, #0a1628 60%, #050a14 100%)",
            border: isHit ? "4px solid #ef4444" : "4px solid #3b82f6",
            boxShadow: isHit
              ? "0 0 40px rgba(239,68,68,0.9), 0 0 80px rgba(239,68,68,0.4)"
              : "0 0 20px rgba(59,130,246,0.4), inset 0 2px 8px rgba(0,0,0,0.6)",
            cursor: "pointer",
            transition: "all 0.05s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          <span
            style={{
              color: isHit ? "#fca5a5" : "#93c5fd",
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: 2,
              fontFamily: "'Bricolage Grotesque', sans-serif",
            }}
          >
            KICK
          </span>
        </button>

        <div className="space-y-1">
          <div className="text-xs font-mono" style={{ color: "#475569" }}>
            TAP TO FIRE
          </div>
          <div className="text-xs font-mono" style={{ color: "#475569" }}>
            TOUCH / CLICK
          </div>
          <div
            className="text-xs font-bold font-mono mt-2"
            style={{ color: isHit ? "#ef4444" : "#1e40af" }}
          >
            {isHit ? "HIT!" : "READY"}
          </div>
          <div
            className="text-xs font-mono"
            style={{ color: "#334155", fontSize: 10 }}
          >
            150Hz → 40Hz drop
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* THUMP 60Hz */}
        {sliderBox(
          "THUMP — 60 Hz",
          "Deep warm sub thump",
          thump60,
          -12,
          12,
          "kickdrum.toggle",
          handleThump60,
          thump60 === 0 ? "FLAT" : `${thump60 > 0 ? "+" : ""}${thump60} dB`,
          thump60 > 0,
        )}

        {/* KICK 100Hz */}
        {sliderBox(
          "KICK — 100 Hz",
          "Punchy kick presence",
          kick100,
          -12,
          12,
          "kickdrum.select",
          handleKick100,
          kick100 === 0 ? "FLAT" : `${kick100 > 0 ? "+" : ""}${kick100} dB`,
          kick100 > 0,
        )}

        {/* 80 Hz Saft Drop */}
        <div
          className="rounded p-4 space-y-3"
          style={{ background: "#060c1a", border: "1px solid #1e3a6e" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <span
                className="text-xs font-bold tracking-widest"
                style={{
                  color: "#ef4444",
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                }}
              >
                80 Hz SAFT DROP
              </span>
              <div
                className="text-xs font-mono mt-0.5"
                style={{ color: "#475569" }}
              >
                Pulls 80Hz down safely — leaves all other bass open
              </div>
            </div>
            <div className="text-right">
              <span
                className="text-sm font-bold font-mono"
                style={{ color: drop80 > 0 ? "#ef4444" : "#3b82f6" }}
              >
                {dropDbDisplay}
              </span>
              <div
                className="text-xs font-mono"
                style={{ color: "#475569", fontSize: 9 }}
              >
                80 Hz only
              </div>
            </div>
          </div>
          <input
            data-ocid="kickdrum.input"
            type="range"
            min="0"
            max="100"
            step="1"
            value={drop80}
            onChange={(e) => handle80HzDrop(Number(e.target.value))}
            className="w-full"
            style={{
              accentColor: drop80 > 0 ? "#ef4444" : "#3b82f6",
              height: "8px",
            }}
          />
          <div
            className="flex justify-between text-xs font-mono"
            style={{ color: "#334155" }}
          >
            <span>FLAT (0 dB)</span>
            <span style={{ fontSize: 9 }}>SAFT MODE — max -18 dB</span>
            <span>MAX DROP (-18 dB)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
