interface PowerWiresProps {
  powered: boolean;
}

export function PowerWires({ powered }: PowerWiresProps) {
  return (
    <div
      className="flex items-center justify-center gap-4"
      style={{ padding: "8px 0" }}
    >
      {/* Red dot — positive */}
      <div
        style={{
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: powered ? "#ef4444" : "#374151",
          border: "2px solid #6b7280",
          boxShadow: powered ? "0 0 8px #ef4444" : "none",
          transition: "all 0.4s ease",
        }}
      />
      {/* Black dot — negative */}
      <div
        style={{
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: powered ? "#1c1c1c" : "#111827",
          border: "2px solid #4b5563",
          boxShadow: powered ? "0 0 4px rgba(156,163,175,0.3)" : "none",
          transition: "all 0.4s ease",
        }}
      />
    </div>
  );
}
