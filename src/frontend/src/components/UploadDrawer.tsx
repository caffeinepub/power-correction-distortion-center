import { useEffect, useRef, useState } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";

const SAVE_KEY = "pcdc_upload_slots";

type SlotStatus = "idle" | "uploading" | "complete" | "error";

interface SavedFileEntry {
  fileName: string;
  directUrl: string | null;
}

interface SavedSlotData {
  files: SavedFileEntry[];
}

interface UploadedFile {
  file: File;
  previewUrl: string | null;
  progress: number;
  status: SlotStatus;
  directUrl: string | null;
  errorMsg: string | null;
}

interface UploadSlot {
  uploadedFiles: UploadedFile[];
  savedEntries: SavedFileEntry[];
  slotStatus: SlotStatus;
}

const DEFAULT_SLOT: UploadSlot = {
  uploadedFiles: [],
  savedEntries: [],
  slotStatus: "idle",
};

function loadSavedSlots(): [UploadSlot, UploadSlot] {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return [{ ...DEFAULT_SLOT }, { ...DEFAULT_SLOT }];
    const parsed = JSON.parse(raw) as [SavedSlotData, SavedSlotData];
    return parsed.map((s) => ({
      ...DEFAULT_SLOT,
      savedEntries: s.files || [],
      slotStatus: (s.files?.length ? "complete" : "idle") as SlotStatus,
    })) as [UploadSlot, UploadSlot];
  } catch {
    return [{ ...DEFAULT_SLOT }, { ...DEFAULT_SLOT }];
  }
}

interface UploadDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function UploadDrawer({ open, onClose }: UploadDrawerProps) {
  const [slots, setSlots] = useState<[UploadSlot, UploadSlot]>(loadSavedSlots);
  const [savedFlash, setSavedFlash] = useState<[boolean, boolean]>([
    false,
    false,
  ]);

  const fileInputRef0 = useRef<HTMLInputElement>(null);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRefs = [fileInputRef0, fileInputRef1] as const;

  useEffect(() => {
    if (open) {
      setSlots(loadSavedSlots());
    }
  }, [open]);

  function patchSlot(index: 0 | 1, patch: Partial<UploadSlot>) {
    setSlots((prev) => {
      const next: [UploadSlot, UploadSlot] = [{ ...prev[0] }, { ...prev[1] }];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function patchFileInSlot(
    slotIndex: 0 | 1,
    fileIndex: number,
    patch: Partial<UploadedFile>,
  ) {
    setSlots((prev) => {
      const next: [UploadSlot, UploadSlot] = [{ ...prev[0] }, { ...prev[1] }];
      const updatedFiles = [...next[slotIndex].uploadedFiles];
      updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...patch };
      next[slotIndex] = { ...next[slotIndex], uploadedFiles: updatedFiles };
      return next;
    });
  }

  function handleFileChange(
    index: 0 | 1,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    // Revoke old preview URLs
    const old = slots[index];
    for (const uf of old.uploadedFiles) {
      if (uf.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(uf.previewUrl);
      }
    }

    const newUploadedFiles: UploadedFile[] = Array.from(fileList).map(
      (file) => ({
        file,
        previewUrl: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : null,
        progress: 0,
        status: "idle" as SlotStatus,
        directUrl: null,
        errorMsg: null,
      }),
    );

    patchSlot(index, {
      uploadedFiles: newUploadedFiles,
      savedEntries: [],
      slotStatus: "idle",
    });
  }

  async function handleUpload(slotIndex: 0 | 1) {
    const slot = slots[slotIndex];
    if (slot.uploadedFiles.length === 0 || slot.slotStatus === "uploading")
      return;

    patchSlot(slotIndex, { slotStatus: "uploading" });

    try {
      const config = await loadConfig();
      const { HttpAgent } = await import("@icp-sdk/core/agent");
      const agent = new HttpAgent({ host: config.backend_host });
      if (config.backend_host?.includes("localhost")) {
        await agent.fetchRootKey().catch(() => {});
      }

      const storageClient = new StorageClient(
        config.bucket_name,
        config.storage_gateway_url,
        config.backend_canister_id,
        config.project_id,
        agent,
      );

      // Upload all files
      await Promise.all(
        slot.uploadedFiles.map(async (uf, fileIndex) => {
          patchFileInSlot(slotIndex, fileIndex, {
            status: "uploading",
            progress: 0,
            errorMsg: null,
          });
          try {
            const bytes = new Uint8Array(await uf.file.arrayBuffer());
            const { hash } = await storageClient.putFile(bytes, (pct) => {
              patchFileInSlot(slotIndex, fileIndex, { progress: pct });
            });
            const directUrl = await storageClient.getDirectURL(hash);
            patchFileInSlot(slotIndex, fileIndex, {
              status: "complete",
              progress: 100,
              directUrl,
            });
          } catch (err: any) {
            patchFileInSlot(slotIndex, fileIndex, {
              status: "error",
              errorMsg: err?.message ?? "Upload failed",
            });
          }
        }),
      );

      patchSlot(slotIndex, { slotStatus: "complete" });
    } catch (_e) {
      patchSlot(slotIndex, { slotStatus: "error" });
    }
  }

  function handleSave(index: 0 | 1) {
    const slot = slots[index];
    const thisEntries: SavedFileEntry[] = slot.uploadedFiles.map((uf) => ({
      fileName: uf.file.name,
      directUrl: uf.directUrl,
    }));
    if (thisEntries.length === 0 && slot.savedEntries.length === 0) return;

    const entriesToSave =
      thisEntries.length > 0 ? thisEntries : slot.savedEntries;
    const other = slots[index === 0 ? 1 : 0];
    const otherEntries: SavedFileEntry[] =
      other.uploadedFiles.length > 0
        ? other.uploadedFiles.map((uf) => ({
            fileName: uf.file.name,
            directUrl: uf.directUrl,
          }))
        : other.savedEntries;

    const pair: [SavedSlotData, SavedSlotData] =
      index === 0
        ? [{ files: entriesToSave }, { files: otherEntries }]
        : [{ files: otherEntries }, { files: entriesToSave }];

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(pair));
    } catch {
      // storage unavailable
    }

    patchSlot(index, { savedEntries: entriesToSave });
    setSavedFlash((prev) => {
      const next: [boolean, boolean] = [...prev] as [boolean, boolean];
      next[index] = true;
      return next;
    });
    setTimeout(() => {
      setSavedFlash((prev) => {
        const next: [boolean, boolean] = [...prev] as [boolean, boolean];
        next[index] = false;
        return next;
      });
    }, 1500);
  }

  function handleClear(index: 0 | 1) {
    const old = slots[index];
    for (const uf of old.uploadedFiles) {
      if (uf.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(uf.previewUrl);
      }
    }
    const ref = fileInputRefs[index].current;
    if (ref) ref.value = "";
    patchSlot(index, { ...DEFAULT_SLOT });
  }

  const statusLabel: Record<SlotStatus, string> = {
    idle: "READY",
    uploading: "UPLOADING...",
    complete: "COMPLETE",
    error: "ERROR",
  };

  const statusColor: Record<SlotStatus, string> = {
    idle: "#3b82f6",
    uploading: "#facc15",
    complete: "#22c55e",
    error: "#ef4444",
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          role="button"
          tabIndex={0}
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9998,
          }}
          data-ocid="upload_drawer.modal"
        />
      )}

      {/* Drawer */}
      <div
        data-ocid="upload_drawer.panel"
        style={{
          position: "fixed",
          top: 0,
          right: open ? 0 : "-420px",
          width: "380px",
          height: "100vh",
          background: "#03080f",
          borderLeft: "2px solid #1e40af",
          zIndex: 9999,
          transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          boxShadow: "-8px 0 40px rgba(30,64,175,0.35)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px 14px",
            borderBottom: "1px solid #1e3a6e",
            background: "#040c1a",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                color: "#facc15",
                fontWeight: 800,
                fontSize: "16px",
                letterSpacing: "0.12em",
                fontFamily: "'Bricolage Grotesque', sans-serif",
              }}
            >
              📁 UPLOAD CENTER
            </div>
            <div
              style={{
                color: "#3b82f6",
                fontSize: "10px",
                marginTop: 2,
                letterSpacing: "0.08em",
              }}
            >
              2 SLOTS · 10 GB MAX PER FILE · MULTI-SELECT ENABLED
            </div>
          </div>
          <button
            type="button"
            data-ocid="upload_drawer.close_button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #1e40af",
              color: "#3b82f6",
              borderRadius: "4px",
              cursor: "pointer",
              padding: "4px 10px",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Slots */}
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {([0, 1] as const).map((i) => {
            const slot = slots[i];
            const hasFiles = slot.uploadedFiles.length > 0;
            const hasSaved = slot.savedEntries.length > 0;
            const canSave = hasFiles || hasSaved;
            const canUpload =
              hasFiles &&
              slot.slotStatus !== "uploading" &&
              slot.slotStatus !== "complete";

            return (
              <div
                key={i}
                data-ocid={`upload_drawer.item.${i + 1}`}
                style={{
                  background: "#040c1a",
                  border: `1px solid ${
                    slot.slotStatus === "complete"
                      ? "#1e40af"
                      : slot.slotStatus === "error"
                        ? "#ef444460"
                        : "#1e3a6e"
                  }`,
                  borderRadius: "6px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {/* Slot title */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      color: "#facc15",
                      fontWeight: 700,
                      fontSize: "12px",
                      letterSpacing: "0.12em",
                    }}
                  >
                    UPLOAD SLOT {i + 1}
                    {hasFiles && (
                      <span
                        style={{
                          color: "#3b82f6",
                          fontWeight: 400,
                          marginLeft: 6,
                        }}
                      >
                        ({slot.uploadedFiles.length} file
                        {slot.uploadedFiles.length !== 1 ? "s" : ""})
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      color: statusColor[slot.slotStatus],
                      fontWeight: 700,
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {statusLabel[slot.slotStatus]}
                  </span>
                </div>

                {/* Image previews grid */}
                {hasFiles && slot.uploadedFiles.some((uf) => uf.previewUrl) && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "4px",
                      border: "1px solid #1e3a6e",
                      borderRadius: "4px",
                      overflow: "hidden",
                      maxHeight: "200px",
                      overflowY: "auto",
                    }}
                  >
                    {slot.uploadedFiles
                      .filter((uf) => uf.previewUrl)
                      .map((uf) => (
                        <div
                          key={uf.file.name}
                          style={{ position: "relative", aspectRatio: "1" }}
                        >
                          <img
                            src={uf.previewUrl!}
                            alt={uf.file.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                          {uf.status === "complete" && (
                            <div
                              style={{
                                position: "absolute",
                                top: 2,
                                right: 2,
                                background: "#22c55e",
                                color: "#fff",
                                fontSize: "8px",
                                fontWeight: 700,
                                borderRadius: "2px",
                                padding: "1px 3px",
                              }}
                            >
                              ✓
                            </div>
                          )}
                          {uf.status === "uploading" && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: "3px",
                                background: "#0a1628",
                              }}
                            >
                              <div
                                style={{
                                  width: `${uf.progress}%`,
                                  height: "100%",
                                  background: "#3b82f6",
                                  transition: "width 0.2s ease",
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {/* File list */}
                {hasFiles && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      maxHeight: "130px",
                      overflowY: "auto",
                    }}
                  >
                    {slot.uploadedFiles.map((uf) => (
                      <div
                        key={uf.file.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 6px",
                          background: "#051020",
                          borderRadius: "3px",
                          border: `1px solid ${
                            uf.status === "complete"
                              ? "#1e40af"
                              : uf.status === "error"
                                ? "#ef444440"
                                : "#0f1f3a"
                          }`,
                        }}
                      >
                        <span
                          style={{
                            color: statusColor[uf.status],
                            fontSize: "9px",
                            flexShrink: 0,
                          }}
                        >
                          {uf.status === "complete"
                            ? "✓"
                            : uf.status === "error"
                              ? "✕"
                              : uf.status === "uploading"
                                ? "↑"
                                : "○"}
                        </span>
                        <span
                          style={{
                            color: "#3b82f6",
                            fontSize: "10px",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: "monospace",
                          }}
                        >
                          {uf.file.name}
                        </span>
                        <span
                          style={{
                            color: "#475569",
                            fontSize: "9px",
                            flexShrink: 0,
                          }}
                        >
                          {(uf.file.size / (1024 * 1024)).toFixed(1)}MB
                        </span>
                        {uf.status === "uploading" && (
                          <span
                            style={{
                              color: "#facc15",
                              fontSize: "9px",
                              flexShrink: 0,
                            }}
                          >
                            {uf.progress}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Saved entries (restored from localStorage) */}
                {!hasFiles && hasSaved && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      maxHeight: "100px",
                      overflowY: "auto",
                    }}
                  >
                    <div
                      style={{
                        color: "#475569",
                        fontSize: "9px",
                        letterSpacing: "0.06em",
                        marginBottom: 2,
                      }}
                    >
                      PREVIOUSLY SAVED
                    </div>
                    {slot.savedEntries.map((entry) => (
                      <div
                        key={entry.fileName}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "3px 6px",
                          background: "#051020",
                          borderRadius: "3px",
                          border: "1px solid #1e40af",
                        }}
                      >
                        <span style={{ color: "#22c55e", fontSize: "9px" }}>
                          ✓
                        </span>
                        <span
                          style={{
                            color: "#3b82f6",
                            fontSize: "10px",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: "monospace",
                          }}
                        >
                          {entry.fileName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Errors for individual files */}
                {slot.uploadedFiles.some((uf) => uf.status === "error") && (
                  <div
                    data-ocid="upload_drawer.error_state"
                    style={{
                      color: "#ef4444",
                      fontSize: "10px",
                      background: "#150505",
                      border: "1px solid #ef444440",
                      borderRadius: "4px",
                      padding: "8px",
                    }}
                  >
                    {slot.uploadedFiles
                      .filter((uf) => uf.status === "error")
                      .map((uf) => (
                        <div key={uf.file.name}>
                          ⚠ {uf.file.name}: {uf.errorMsg}
                        </div>
                      ))}
                  </div>
                )}

                {/* Complete success */}
                {slot.slotStatus === "complete" && (
                  <div
                    data-ocid="upload_drawer.success_state"
                    style={{
                      color: "#22c55e",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    ✓{" "}
                    {
                      slot.uploadedFiles.filter(
                        (uf) => uf.status === "complete",
                      ).length
                    }{" "}
                    FILE
                    {slot.uploadedFiles.filter((uf) => uf.status === "complete")
                      .length !== 1
                      ? "S"
                      : ""}{" "}
                    UPLOADED SUCCESSFULLY
                  </div>
                )}

                {/* Hidden file input — multiple enabled */}
                <input
                  ref={fileInputRefs[i]}
                  type="file"
                  multiple
                  accept="image/*,audio/*,video/*,application/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFileChange(i, e)}
                />

                {/* Actions */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    data-ocid={`upload_drawer.upload_button.${i + 1}`}
                    onClick={() => fileInputRefs[i].current?.click()}
                    disabled={slot.slotStatus === "uploading"}
                    style={{
                      flex: 1,
                      background:
                        slot.slotStatus === "uploading"
                          ? "#0a1628"
                          : "linear-gradient(135deg, #1d4ed8, #1e40af)",
                      color:
                        slot.slotStatus === "uploading" ? "#334155" : "#93c5fd",
                      border: "1px solid #1e40af",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      cursor:
                        slot.slotStatus === "uploading"
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: 700,
                      fontSize: "11px",
                      letterSpacing: "0.08em",
                    }}
                  >
                    📂 SELECT FILES
                  </button>

                  {canUpload && (
                    <button
                      type="button"
                      data-ocid={`upload_drawer.primary_button.${i + 1}`}
                      onClick={() => handleUpload(i)}
                      style={{
                        flex: 1,
                        background: "linear-gradient(135deg, #991b1b, #b91c1c)",
                        color: "#fca5a5",
                        border: "1px solid #ef4444",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "11px",
                        letterSpacing: "0.08em",
                      }}
                    >
                      ⬆ UPLOAD ALL
                    </button>
                  )}

                  {canSave && (
                    <button
                      type="button"
                      data-ocid={`upload_drawer.save_button.${i + 1}`}
                      onClick={() => handleSave(i)}
                      disabled={slot.slotStatus === "uploading"}
                      style={{
                        background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
                        color: "#facc15",
                        border: "1px solid #facc15",
                        borderRadius: "4px",
                        padding: "8px 12px",
                        cursor:
                          slot.slotStatus === "uploading"
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: 700,
                        fontSize: "11px",
                        letterSpacing: "0.08em",
                        opacity: slot.slotStatus === "uploading" ? 0.5 : 1,
                      }}
                    >
                      💾 SAVE ALL
                    </button>
                  )}

                  {/* SAVED flash */}
                  {savedFlash[i] && (
                    <span
                      style={{
                        color: "#22c55e",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      SAVED ✓
                    </span>
                  )}

                  {hasFiles && (
                    <button
                      type="button"
                      data-ocid={`upload_drawer.delete_button.${i + 1}`}
                      onClick={() => handleClear(i)}
                      disabled={slot.slotStatus === "uploading"}
                      style={{
                        background: "transparent",
                        color:
                          slot.slotStatus === "uploading"
                            ? "#334155"
                            : "#ef4444",
                        border: `1px solid ${
                          slot.slotStatus === "uploading"
                            ? "#1e3a6e"
                            : "#ef444460"
                        }`,
                        borderRadius: "4px",
                        padding: "8px 10px",
                        cursor:
                          slot.slotStatus === "uploading"
                            ? "not-allowed"
                            : "pointer",
                        fontWeight: 700,
                        fontSize: "11px",
                      }}
                    >
                      ✕ CLEAR
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div
          style={{
            marginTop: "auto",
            padding: "14px 16px",
            borderTop: "1px solid #0f1f3a",
            color: "#1e40af",
            fontSize: "9px",
            letterSpacing: "0.06em",
            flexShrink: 0,
          }}
        >
          SELECT MULTIPLE FILES AT ONCE · UP TO 10 GB PER FILE · STORED ON
          INTERNET COMPUTER
        </div>
      </div>
    </>
  );
}
