interface BrutusAmpProps {
  powered: boolean;
}

export function BrutusAmp({ powered }: BrutusAmpProps) {
  return (
    <div
      data-ocid="amp.panel"
      className="rounded-lg overflow-hidden w-full"
      style={{
        background:
          "linear-gradient(180deg, #d1d5db 0%, #9ca3af 25%, #6b7280 50%, #9ca3af 75%, #d1d5db 100%)",
        border: powered ? "3px solid #3b82f6" : "3px solid #374151",
        boxShadow: powered
          ? "0 0 40px rgba(59,130,246,0.5), 0 0 80px rgba(29,78,216,0.2)"
          : "0 4px 20px rgba(0,0,0,0.5)",
        transition: "box-shadow 0.6s ease, border-color 0.6s ease",
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

      <div className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex flex-col gap-3">
          {([0, 1, 2, 3] as const).map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                background: powered ? "#3b82f6" : "#1e3a6e",
                boxShadow: powered
                  ? "0 0 8px #3b82f6, 0 0 16px #1d4ed8"
                  : "none",
                transition: "all 0.4s ease",
              }}
            />
          ))}
        </div>

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
              color: powered ? "#1d4ed8" : "#374151",
              fontFamily: "'Bricolage Grotesque', sans-serif",
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
          {/* FIX 3: corrected wattage to 60,000,000W */}
          <div
            className="mt-3 text-xs font-mono"
            style={{ color: powered ? "#1d4ed8" : "#6b7280" }}
          >
            60,000,000W | 0 GAUGE WIRE
          </div>

          {/* FIX 3: 4 fuse visuals */}
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
                        ? "0 0 8px rgba(239,68,68,0.6)"
                        : "none",
                      transition: "all 0.4s ease",
                    }}
                  >
                    {/* Fuse wire */}
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

        <div className="flex flex-col gap-3">
          {([0, 1, 2, 3] as const).map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                background: powered ? "#3b82f6" : "#1e3a6e",
                boxShadow: powered
                  ? "0 0 8px #3b82f6, 0 0 16px #1d4ed8"
                  : "none",
                transition: "all 0.4s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* FIX 3: 0-gauge wire visual */}
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
            boxShadow: powered
              ? "0 0 10px rgba(59,130,246,0.5), 0 0 20px rgba(29,78,216,0.2)"
              : "none",
            transition: "box-shadow 0.6s ease",
          }}
        />
      </div>

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
              ? "0 0 20px #3b82f6, 0 0 40px rgba(29,78,216,0.25), inset 0 2px 4px rgba(255,255,255,0.1)"
              : "0 0 8px #1e3a6e",
            border: "2px solid #3b82f6",
            transition: "all 0.4s ease",
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: powered ? "#60a5fa" : "#1e3a6e",
              boxShadow: powered ? "0 0 6px #60a5fa" : "none",
            }}
          />
        </div>
        <div className="text-xs font-mono" style={{ color: "#475569" }}>
          SRS-2202
        </div>
      </div>

      {powered && (
        <div
          className="absolute inset-0 pointer-events-none rounded-lg"
          style={{
            boxShadow: "inset 0 0 30px rgba(59,130,246,0.15)",
            animation: "ampPulse 2s ease-in-out infinite",
          }}
        />
      )}
      <style>{"@keyframes ampPulse{0%,100%{opacity:1}50%{opacity:0.6}}"}</style>
    </div>
  );
}
