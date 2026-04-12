import { useState, useRef, useEffect } from "react";
import { useEditor } from "../contexts/EditorContext";
import { useComponents } from "../hooks/useEditorData";
import api from "../services/api";
import TenantCohortSelector from "../components/layout-editor/TenantCohortSelector";
import ViewportToggle from "../components/layout-editor/ViewportToggle";
import { emitToast } from "../components/layout-editor/PublishBar";
import { Trash2, X } from "lucide-react";
import type { ComponentEntry } from "../hooks/useEditorData";

type ComponentSize = "small" | "medium" | "large" | "full";

interface PlacedComponent {
  id: string;
  componentCode: string;
  name: string;
  slotType: string;
  col: number;
  row: number;
  colSpan: number;
  height: number; // px, 0 = auto
  props: Record<string, unknown>;
}

const SIZE_SPAN: Record<ComponentSize, number> = { small: 3, medium: 4, large: 6, full: 12 };
const SIZE_CYCLE: ComponentSize[] = ["small", "medium", "large", "full"];
const DEFAULT_SIZES: Record<string, ComponentSize> = {
  sidebar: "small", dial: "medium", info_card: "medium", streak_calendar: "medium",
  actions_list: "large", recent_activity: "full", card_info: "medium", transactions: "medium", adventures: "full",
};
const SLOT_LABELS: Record<string, string> = {
  dial: "Rewards Dial", info_card: "Info Cards", streak_calendar: "Streak Calendar",
  actions_list: "Actions List", recent_activity: "Recent Activity", sidebar: "Navigation",
  card_info: "Card Info", transactions: "Transactions", adventures: "Adventures",
};

let _id = 0;

export default function V2EditorPage() {
  const editor = useEditor();
  const { data: components = [] } = useComponents();
  const [placed, setPlaced] = useState<PlacedComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [librarySizes, setLibrarySizes] = useState<Record<string, ComponentSize>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dragData = useRef<ComponentEntry | null>(null);
  const hoverPos = useRef<{ row: number; col: number } | null>(null);

  const tenantCode = editor.selectedTenant?.code ?? "kaiser";
  const viewport = editor.viewport;
  const isDesktop = viewport === "desktop";
  const isReady = !!(editor.selectedTenant && editor.selectedCohort && editor.selectedRoute);

  // Show ALL components — one per slot type only
  const usedSlotTypes = new Set(placed.map((c) => c.slotType));
  const filtered = components.filter((c) => !usedSlotTypes.has(c.slotType));
  const grouped = filtered.reduce<Record<string, ComponentEntry[]>>((acc, c) => {
    if (!acc[c.slotType]) acc[c.slotType] = [];
    acc[c.slotType].push(c);
    return acc;
  }, {});

  // Sync to iframe
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "v2-layout", components: placed }, "*");
  }, [placed]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: "v2-select", id: selectedId }, "*");
  }, [selectedId]);

  // Messages from iframe
  // Toast listener
  useEffect(() => {
    function handleToast(e: Event) {
      setToast((e as CustomEvent).detail);
      setTimeout(() => setToast(null), 2000);
    }
    window.addEventListener("app-toast", handleToast);
    return () => window.removeEventListener("app-toast", handleToast);
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg?.type) return;
      if (msg.type === "v2-clicked") setSelectedId(msg.id);
      if (msg.type === "v2-hover-pos") hoverPos.current = { row: msg.row, col: msg.col };
      if (msg.type === "v2-remove") {
        setPlaced((p) => p.filter((c) => c.id !== msg.id));
        setSelectedId(null);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function handleDragStart(e: React.DragEvent, comp: ComponentEntry) {
    dragData.current = comp;
    e.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);
    hoverPos.current = null;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    iframeRef.current?.contentWindow?.postMessage({ type: "v2-drag-end" }, "*");
    const pos = hoverPos.current;
    const comp = dragData.current;
    if (comp && pos) {
      const size = librarySizes[comp.code] ?? DEFAULT_SIZES[comp.slotType] ?? "medium";
      const newComp: PlacedComponent = {
        id: `v2-${++_id}`,
        componentCode: comp.code,
        name: comp.name,
        slotType: comp.slotType,
        col: pos.col,
        row: pos.row,
        colSpan: SIZE_SPAN[size],
        height: 0,
        props: comp.defaultProps ?? {},
      };
      setPlaced((prev) => [...prev, newComp]);
    }
    dragData.current = null;
    hoverPos.current = null;
  }

  function handleIframeLoad() {
    if (placed.length > 0) {
      iframeRef.current?.contentWindow?.postMessage({ type: "v2-layout", components: placed }, "*");
    }
  }

  // Build a V1-compatible layoutJson from placed components
  function buildLayoutJson() {
    const cols = 12;
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentColUsed = 0;

    for (const comp of placed) {
      if (currentColUsed + comp.colSpan > cols) {
        // Fill remaining with dots
        while (currentRow.length < cols) currentRow.push(".");
        rows.push(currentRow);
        currentRow = [];
        currentColUsed = 0;
      }
      const areaName = comp.slotType;
      for (let i = 0; i < comp.colSpan; i++) currentRow.push(areaName);
      currentColUsed += comp.colSpan;
    }
    if (currentRow.length > 0) {
      while (currentRow.length < cols) currentRow.push(".");
      rows.push(currentRow);
    }

    const slots: Record<string, { componentCode: string; gridArea: string; props: Record<string, unknown> }> = {};
    for (const comp of placed) {
      slots[comp.slotType] = {
        componentCode: comp.componentCode,
        gridArea: comp.slotType,
        props: comp.props,
      };
    }

    return {
      routePath: editor.selectedRoute?.path ?? "/",
      viewport,
      gridTemplate: {
        columns: `repeat(${cols}, 1fr)`,
        rows: rows.map(() => "auto").join(" "),
        gap: "12px",
        areas: rows.map((r) => r.join(" ")),
      },
      slots,
    };
  }

  async function handlePublish() {
    if (!editor.selectedRoute || !editor.selectedTenant || !editor.selectedCohort || placed.length === 0) return;
    setIsPublishing(true);
    try {
      const layoutJson = buildLayoutJson();
      // Create draft
      const draftRes = await api.post("/layouts", {
        routeId: editor.selectedRoute.id,
        tenantId: editor.selectedTenant.id,
        cohortId: editor.selectedCohort.id,
        viewport,
        layoutJson,
      });
      const draftId = draftRes.data.data.id;
      // Publish it
      await api.post(`/layouts/${draftId}/publish`);
      emitToast("V2 layout published successfully");
    } catch (err) {
      console.error("Publish failed:", err);
      emitToast("Publish failed — check console");
    }
    setIsPublishing(false);
  }

  const selectedComp = selectedId ? placed.find((c) => c.id === selectedId) : null;
  const previewUrl = `${import.meta.env.VITE_CONSUMER_URL || "http://localhost:5174"}/preview/v2?tenantCode=${encodeURIComponent(tenantCode)}&viewport=${viewport}`;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <TenantCohortSelector />
        <div className="flex items-center gap-4">
          <ViewportToggle />
          <span className="text-xs text-gray-400">{placed.length} components</span>
          {placed.length > 0 && (
            <>
              <button onClick={() => { setPlaced([]); setSelectedId(null); }}
                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                Clear all
              </button>
              <button onClick={handlePublish} disabled={isPublishing || !isReady}
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors">
                {isPublishing ? "Publishing..." : "Publish"}
              </button>
            </>
          )}
        </div>
      </div>

      {!isReady ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <svg className="w-12 h-12 text-neutral-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            <p className="text-lg font-medium">Select a tenant, cohort, and route to start building</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Sidebar */}
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col shrink-0">
            {selectedComp ? (
              <div className="flex flex-col h-full">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-900">{selectedComp.name}</h3>
                  <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-gray-100"><X className="w-3.5 h-3.5 text-gray-400" /></button>
                </div>
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Width (columns: {selectedComp.colSpan}/12)</label>
                    <input type="range" min={1} max={12} value={selectedComp.colSpan}
                      onChange={(e) => setPlaced((p) => p.map((c) => c.id === selectedComp.id ? { ...c, colSpan: Number(e.target.value) } : c))}
                      className="w-full mt-1.5 accent-black" />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                      <span>1</span><span>6</span><span>12</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      Height: {selectedComp.height === 0 ? "Auto" : `${selectedComp.height}px`}
                    </label>
                    <input type="range" min={0} max={600} step={10} value={selectedComp.height}
                      onChange={(e) => setPlaced((p) => p.map((c) => c.id === selectedComp.id ? { ...c, height: Number(e.target.value) } : c))}
                      className="w-full mt-1.5 accent-black" />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                      <span>Auto</span><span>300px</span><span>600px</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Position</label>
                    <p className="text-xs text-gray-600 mt-1">Row {selectedComp.row}, Col {selectedComp.col}–{selectedComp.col + selectedComp.colSpan - 1}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Swap variant</label>
                    <div className="space-y-1.5 mt-1.5">
                      {components.filter((c) => c.slotType === selectedComp.slotType).map((comp) => (
                        <button key={comp.code}
                          onClick={() => setPlaced((p) => p.map((c) => c.id === selectedComp.id ? { ...c, componentCode: comp.code, name: comp.name, props: comp.defaultProps ?? {} } : c))}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs ${comp.code === selectedComp.componentCode ? "bg-black text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>
                          {comp.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => { setPlaced((p) => p.filter((c) => c.id !== selectedComp.id)); setSelectedId(null); }}
                    className="w-full py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 flex items-center justify-center gap-1.5">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Component Library</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Drag onto the canvas to place</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {Object.keys(grouped).length === 0 && placed.length > 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">All component types placed</p>
                  )}
                  {Object.entries(grouped).map(([slotType, comps]) => (
                    <div key={slotType}>
                      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{SLOT_LABELS[slotType] ?? slotType}</h4>
                      <div className="space-y-2">
                        {comps.map((comp) => {
                          const currentSize = librarySizes[comp.code] ?? DEFAULT_SIZES[comp.slotType] ?? "medium";
                          const previewCompUrl = `${import.meta.env.VITE_CONSUMER_URL || "http://localhost:5174"}/preview/component?code=${encodeURIComponent(comp.code)}&props=${encodeURIComponent(JSON.stringify(comp.defaultProps ?? {}))}&tenant=${encodeURIComponent(tenantCode)}`;
                          return (
                            <div key={comp.code} className="rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all overflow-hidden">
                              <div draggable onDragStart={(e) => handleDragStart(e, comp)}
                                className="h-20 overflow-hidden bg-[#f5f5f0] select-none cursor-grab active:cursor-grabbing relative group">
                                <iframe src={previewCompUrl} className="w-[250%] h-[250%] border-0 pointer-events-none origin-top-left" style={{ transform: "scale(0.4)" }} tabIndex={-1} title={comp.name} />
                                <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-colors" />
                              </div>
                              <div className="px-2.5 py-1.5 flex items-center justify-between">
                                <span className="text-[11px] font-medium text-gray-800 truncate">{comp.name}</span>
                                <div className="flex gap-0.5">
                                  {SIZE_CYCLE.map((s) => (
                                    <button key={s}
                                      onClick={() => setLibrarySizes((prev) => ({ ...prev, [comp.code]: s }))}
                                      className={`w-6 h-5 text-[8px] font-bold rounded transition-colors ${currentSize === s ? "bg-black text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                                      {s[0].toUpperCase()}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-4"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              const comp = dragData.current;
              const iframe = iframeRef.current;
              if (comp && iframe) {
                const rect = iframe.getBoundingClientRect();
                const size = librarySizes[comp.code] ?? DEFAULT_SIZES[comp.slotType] ?? "medium";
                iframe.contentWindow?.postMessage({
                  type: "v2-drag",
                  x: e.clientX - rect.left, y: e.clientY - rect.top,
                  componentCode: comp.code, colSpan: SIZE_SPAN[size], props: comp.defaultProps ?? {},
                }, "*");
              }
            }}
            onDrop={handleDrop}
            onDragEnd={() => { setIsDragging(false); iframeRef.current?.contentWindow?.postMessage({ type: "v2-drag-end" }, "*"); }}>
            {/* Toast */}
            {toast && (
              <div className="fixed top-[135px] right-4 z-50 animate-[slideIn_0.2s_ease-out]">
                <div className="flex items-center gap-2.5 bg-white border border-gray-200 shadow-lg rounded-lg pl-3 pr-2.5 py-2.5">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{toast}</span>
                  <button onClick={() => setToast(null)} className="text-gray-300 hover:text-gray-500 ml-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
            <div className="flex justify-center pb-10">
              <div className={`relative rounded-xl border shadow-lg overflow-hidden bg-white ${isDragging ? "border-black ring-2 ring-black/20" : "border-gray-300"} ${isDesktop ? "w-full max-w-[1100px]" : "w-[390px]"}`}
                style={{ height: isDesktop ? 800 : 844 }}>
                <iframe ref={iframeRef} src={previewUrl} onLoad={handleIframeLoad}
                  className={`w-full h-full border-0 ${isDragging ? "pointer-events-none" : ""}`} title="V2 Preview" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
