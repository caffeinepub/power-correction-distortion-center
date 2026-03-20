import { useEffect, useRef } from "react";

interface DbNodeIndicatorProps {
  analyserNode: AnalyserNode | null;
}

export function DbNodeIndicator({ analyserNode }: DbNodeIndicatorProps) {
  const distortionBarRef = useRef<HTMLDivElement>(null);
  const clippingBarRef = useRef<HTMLDivElement>(null);
  const noiseBarRef = useRef<HTMLDivElement>(null);
  const distortionValRef = useRef<HTMLSpanElement>(null);
  const clippingValRef = useRef<HTMLSpanElement>(null);
  const noiseValRef = useRef<HTMLSpanElement>(null);
  const clippingRowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!analyserNode) return;
    const dataArray = new Float32Array(analyserNode.fftSize);

    function tick() {
      analyserNode!.getFloatTimeDomainData(dataArray);

      let peak = 0;
      let rmsSum = 0;
      let quietCount = 0;
      const quietThreshold = 0.01;

      for (let i = 0; i < dataArray.length; i++) {
        const abs = Math.abs(dataArray[i]);
        if (abs > peak) peak = abs;
        rmsSum += abs * abs;
        if (abs < quietThreshold) quietCount++;
      }

      const rms = Math.sqrt(rmsSum / dataArray.length);
      const peakDb = peak > 0 ? 20 * Math.log10(peak) : -120;
      const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -120;

      // Distortion: peaks above -3 dBFS
      const distortionDb = Math.max(-60, Math.min(0, peakDb));
      const distortionPct = Math.max(0, (distortionDb + 60) / 60) * 100;
      const isDistorting = peakDb > -3;

      // Clipping: peaks above -1 dBFS
      const isClipping = peakDb > -1;
      const clippingPct = isClipping
        ? Math.min(100, (peakDb + 1) * 50 + 80)
        : Math.max(0, (peakDb + 60) / 60) * 60;

      // Noise floor: ratio of quiet samples
      const quietRatio = quietCount / dataArray.length;
      const noisePct = Math.max(0, Math.min(100, ((rmsDb + 80) / 80) * 100));

      if (distortionBarRef.current) {
        distortionBarRef.current.style.width = `${distortionPct}%`;
        distortionBarRef.current.style.background = isDistorting
          ? "linear-gradient(90deg, #1d4ed8, #ef4444)"
          : "linear-gradient(90deg, #1d4ed8, #3b82f6)";
      }
      if (distortionValRef.current) {
        distortionValRef.current.textContent = `${distortionDb.toFixed(1)} dBFS`;
        distortionValRef.current.style.color = isDistorting
          ? "#ef4444"
          : "#60a5fa";
      }

      if (clippingBarRef.current) {
        clippingBarRef.current.style.width = `${clippingPct}%`;
        clippingBarRef.current.style.background = isClipping
          ? "linear-gradient(90deg, #991b1b, #ef4444)"
          : "linear-gradient(90deg, #1d4ed8, #3b82f6)";
      }
      if (clippingValRef.current) {
        clippingValRef.current.textContent = isClipping
          ? `${peakDb.toFixed(1)} dBFS CLIP`
          : `${peakDb.toFixed(1)} dBFS`;
        clippingValRef.current.style.color = isClipping ? "#ef4444" : "#60a5fa";
      }
      if (clippingRowRef.current) {
        clippingRowRef.current.style.borderColor = isClipping
          ? "#ef4444"
          : "#1e3a6e";
        clippingRowRef.current.style.boxShadow = isClipping
          ? "0 0 8px rgba(239,68,68,0.4)"
          : "none";
      }

      if (noiseBarRef.current) {
        noiseBarRef.current.style.width = `${noisePct}%`;
      }
      if (noiseValRef.current) {
        noiseValRef.current.textContent = `${rmsDb.toFixed(1)} dBFS`;
        noiseValRef.current.style.color =
          quietRatio > 0.8 ? "#3b82f6" : "#60a5fa";
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode]);

  const meterRow = (
    label: string,
    barRef: React.RefObject<HTMLDivElement>,
    valRef: React.RefObject<HTMLSpanElement>,
    rowRef?: React.RefObject<HTMLDivElement>,
  ) => (
    <div
      ref={rowRef}
      className="rounded p-3 space-y-2"
      style={{
        background: "#060c1a",
        border: "1px solid #1e3a6e",
        transition: "border-color 0.1s, box-shadow 0.1s",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-bold tracking-widest"
          style={{ color: "#3b82f6" }}
        >
          {label}
        </span>
        <span
          ref={valRef}
          className="text-xs font-mono font-bold"
          style={{ color: "#60a5fa" }}
        >
          — dBFS
        </span>
      </div>
      <div
        className="h-3 rounded-full overflow-hidden"
        style={{ background: "#0a1225" }}
      >
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{
            width: "0%",
            background: "linear-gradient(90deg, #1d4ed8, #3b82f6)",
            transition: "width 0.05s linear",
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      data-ocid="dbnode.panel"
      className="rounded-lg p-5 space-y-4"
      style={{ background: "#0a0f1e", border: "2px solid #1e40af" }}
    >
      <h3
        className="text-sm font-bold tracking-widest"
        style={{
          color: "#3b82f6",
          fontFamily: "'Bricolage Grotesque', sans-serif",
        }}
      >
        DB NODE INDICATOR — SIGNAL MONITOR
      </h3>
      <p className="text-xs font-mono" style={{ color: "#334155" }}>
        REAL-TIME DISTORTION · CLIPPING · NOISE FLOOR DETECTION
      </p>
      <div className="space-y-3">
        {meterRow(
          "DISTORTION",
          distortionBarRef as React.RefObject<HTMLDivElement>,
          distortionValRef as React.RefObject<HTMLSpanElement>,
        )}
        {meterRow(
          "CLIPPING",
          clippingBarRef as React.RefObject<HTMLDivElement>,
          clippingValRef as React.RefObject<HTMLSpanElement>,
          clippingRowRef as React.RefObject<HTMLDivElement>,
        )}
        {meterRow(
          "NOISE FLOOR",
          noiseBarRef as React.RefObject<HTMLDivElement>,
          noiseValRef as React.RefObject<HTMLSpanElement>,
        )}
      </div>
      <div className="text-xs font-mono" style={{ color: "#1e3a6e" }}>
        DISTORTION &gt; -3 dBFS · CLIPPING &gt; -1 dBFS · NOISE = RMS FLOOR
      </div>
    </div>
  );
}
