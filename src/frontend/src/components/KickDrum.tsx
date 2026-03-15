import { useRef, useState } from "react";
import { audioEngine } from "../audio/AudioEngine";

export function KickDrum() {
  const [isHit, setIsHit] = useState(false);
  const [drop80, setDrop80] = useState(0);
  const hitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Tone layer: 150Hz -> 40Hz pitch drop = solid kick thump
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

    // Click/punch layer: tight noise burst for attack snap
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
    audioEngine.set80HzDrop(val);
  }

  const dropDb = -((drop80 / 100) * 12).toFixed(1);

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
        {/* Drum pad */}
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

        {/* Status */}
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

      {/* 80 Hz Saft Drop Slider */}
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
              {drop80 === 0 ? "FLAT" : `${dropDb} dB`}
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
          <span>FLAT (0)</span>
          <span style={{ fontSize: 9 }}>SAFT MODE — max -12 dB</span>
          <span>MAX DROP (100)</span>
        </div>
      </div>
    </div>
  );
}
