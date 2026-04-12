import { useRef, useCallback, useEffect, useState } from "react";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { useEditor } from "../../contexts/EditorContext";
import { Minus, Plus, RotateCcw, Check, X, Smartphone, ChevronDown } from "lucide-react";

interface DevicePreset {
  name: string;
  width: number;
  height: number;
}

const MOBILE_DEVICES: DevicePreset[] = [
  // Apple
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone 14", width: 390, height: 844 },
  { name: "iPhone 15 Pro", width: 393, height: 852 },
  { name: "iPhone 15 Pro Max", width: 430, height: 932 },
  { name: "iPhone 16 Pro", width: 402, height: 874 },
  // Android
  { name: "Pixel 7", width: 412, height: 915 },
  { name: "Pixel 8 Pro", width: 448, height: 998 },
  { name: "Samsung Galaxy S24", width: 360, height: 780 },
  { name: "Samsung Galaxy S24 Ultra", width: 384, height: 824 },
  { name: "OnePlus 12", width: 412, height: 915 },
  // Tablets
  { name: "iPad Mini", width: 768, height: 1024 },
  { name: "iPad Air", width: 820, height: 1180 },
];

interface SlotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function SlotDropZone({
  slotKey,
  rect,
  zoom,
  allowedSlotTypes,
  iframeRef,
}: {
  slotKey: string;
  rect: SlotRect;
  zoom: number;
  allowedSlotTypes: string[];
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}) {
  const { isOver, setNodeRef, active } = useDroppable({
    id: `slot-${slotKey}`,
    data: { type: "slot", slotKey, allowedSlotTypes },
  });

  const draggedSlotType = active?.data?.current?.slotType as string | undefined;
  const isAllowed = draggedSlotType ? allowedSlotTypes.includes(draggedSlotType) : false;

  useEffect(() => {
    if (isOver && isAllowed && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "drag-hover", slotKey }, "*");
    } else if (!isOver && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "drag-hover", slotKey: null }, "*");
    }
  }, [isOver, isAllowed, slotKey, iframeRef]);

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        top: rect.top * zoom,
        left: rect.left * zoom,
        width: rect.width * zoom,
        height: rect.height * zoom,
      }}
      className={`rounded-2xl transition-all ${
        isOver && isAllowed
          ? "ring-4 ring-black bg-black/5"
          : isOver && !isAllowed
          ? "ring-4 ring-red-400 bg-red-400/5"
          : ""
      }`}
    />
  );
}

const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

export default function LayoutCanvas() {
  const { layoutConfig, viewport, selectedTenant, selectedCohort, selectedRoute, selectSlot, selectedSlotKey } = useEditor();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { active } = useDndContext();
  const isDragging = !!active;
  const [slotRects, setSlotRects] = useState<Record<string, SlotRect>>({});
  const [zoom, setZoom] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileDevice, setMobileDevice] = useState<DevicePreset>(MOBILE_DEVICES[1]); // iPhone 14 default
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const slotDefinitions = selectedRoute?.slotDefinitions ?? [];

  // Listen for toast events from PublishBar
  useEffect(() => {
    function handleToast(e: Event) {
      setToast((e as CustomEvent).detail);
      setTimeout(() => setToast(null), 2000);
    }
    window.addEventListener("app-toast", handleToast);
    return () => window.removeEventListener("app-toast", handleToast);
  }, []);


  const isDesktop = viewport === "desktop";

  const iframeWidth = isDesktop ? 1440 : mobileDevice.width;

  const refreshPreview = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "refresh" }, "*");
    }
  }, []);

  (window as unknown as Record<string, unknown>).__refreshPreview = refreshPreview;

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg?.type) return;
      if (msg.type === "slot-clicked") selectSlot(msg.slotKey);
      if (msg.type === "slot-rects") setSlotRects(msg.rects);
      if (msg.type === "slot-clicked" || msg.type === "slot-rects") { /* no fallback reset */ }

    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [selectSlot]);

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "select-slot", slotKey: selectedSlotKey }, "*");
    }
  }, [selectedSlotKey]);

  useEffect(() => {
    if (isDragging && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "get-slot-rects" }, "*");
    }
    if (!isDragging && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "drag-end" }, "*");
      setSlotRects({});
    }
  }, [isDragging]);

  function zoomIn() {
    const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1]);
  }
  function zoomOut() {
    const idx = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1]);
  }
  function resetZoom() {
    setZoom(1);
  }

  if (!layoutConfig || !selectedTenant || !selectedCohort || !selectedRoute) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <svg className="w-12 h-12 text-neutral-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <div className="text-lg font-medium">Select a tenant, cohort, and route to start editing</div>
        </div>
      </div>
    );
  }

  const previewUrl = `${import.meta.env.VITE_CONSUMER_URL || "http://localhost:5174"}/preview?route=${encodeURIComponent(selectedRoute.path)}&viewport=${viewport}&tenantCode=${encodeURIComponent(selectedTenant.code)}&cohortCode=${encodeURIComponent(selectedCohort.code)}&status=draft`;

  const slotAllowedTypes: Record<string, string[]> = {};
  for (const sd of slotDefinitions) {
    slotAllowedTypes[sd.slotKey] = sd.allowedSlotTypes;
  }

  return (
    <div className="flex-1 min-h-0 bg-gray-100 flex flex-col">
      {/* Toolbar + Toast */}
      <div className="shrink-0">
        {/* Toast */}
        {toast && (
          <div className="fixed top-[135px] right-4 z-50 animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-center gap-2.5 bg-white border border-gray-200 shadow-lg rounded-lg pl-3 pr-2.5 py-2.5">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900">{toast}</span>
              <button onClick={() => setToast(null)} className="text-gray-300 hover:text-gray-500 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Zoom controls + device picker */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
          <span className="text-xs text-gray-500 font-medium mr-2">
            {isDesktop
              ? `Desktop ${Math.round(iframeWidth / zoom)}px`
              : `${mobileDevice.name} ${Math.round(mobileDevice.width / zoom)}×${Math.round(mobileDevice.height / zoom)}`
            } — {layoutConfig.routePath}
          </span>

          {/* Device picker (mobile only) */}
          {!isDesktop && (
            <div className="relative">
              <button
                onClick={() => setShowDeviceMenu(!showDeviceMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors text-gray-700"
              >
                <Smartphone className="w-3.5 h-3.5" />
                {mobileDevice.name}
                <ChevronDown className="w-3 h-3" />
              </button>
              {showDeviceMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDeviceMenu(false)} />
                  <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-xl py-1 min-w-[220px] max-h-[360px] overflow-y-auto">
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Apple</div>
                    {MOBILE_DEVICES.filter((d) => d.name.startsWith("iPhone") || d.name.startsWith("iPad")).filter((d) => !d.name.startsWith("iPad")).map((device) => (
                      <button
                        key={device.name}
                        onClick={() => { setMobileDevice(device); setShowDeviceMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          device.name === mobileDevice.name ? "bg-neutral-50 font-semibold text-black" : "text-gray-700"
                        }`}
                      >
                        <span>{device.name}</span>
                        <span className="text-gray-400 text-[10px]">{device.width}×{device.height}</span>
                      </button>
                    ))}
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1 border-t border-gray-100 pt-2">Android</div>
                    {MOBILE_DEVICES.filter((d) => ["Pixel", "Samsung", "OnePlus"].some((p) => d.name.startsWith(p))).map((device) => (
                      <button
                        key={device.name}
                        onClick={() => { setMobileDevice(device); setShowDeviceMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          device.name === mobileDevice.name ? "bg-neutral-50 font-semibold text-black" : "text-gray-700"
                        }`}
                      >
                        <span>{device.name}</span>
                        <span className="text-gray-400 text-[10px]">{device.width}×{device.height}</span>
                      </button>
                    ))}
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1 border-t border-gray-100 pt-2">Tablets</div>
                    {MOBILE_DEVICES.filter((d) => d.name.startsWith("iPad")).map((device) => (
                      <button
                        key={device.name}
                        onClick={() => { setMobileDevice(device); setShowDeviceMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          device.name === mobileDevice.name ? "bg-neutral-50 font-semibold text-black" : "text-gray-700"
                        }`}
                      >
                        <span>{device.name}</span>
                        <span className="text-gray-400 text-[10px]">{device.width}×{device.height}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-center bg-neutral-100 rounded-lg border border-neutral-200 p-0.5">
            <button onClick={zoomOut} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition-colors text-gray-500 hover:text-black" title="Zoom out">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetZoom} className="px-2 h-7 text-xs font-medium text-gray-700 hover:bg-white rounded transition-colors min-w-[52px]" title="Reset zoom">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={zoomIn} className="w-7 h-7 flex items-center justify-center rounded hover:bg-white transition-colors text-gray-500 hover:text-black" title="Zoom in">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button onClick={resetZoom} className="w-7 h-7 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors text-gray-400 hover:text-black" title="Reset to 100%">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={refreshPreview}
            className="ml-2 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-600 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Canvas area — scrollable container */}
      <div className="flex-1 min-h-0 overflow-auto p-4 bg-neutral-100">
        <div className="flex justify-center pb-10">
          {/* Browser zoom simulation:
              iframe renders at (baseWidth / zoom) — this is the effective CSS viewport
              then scaled by zoom to fit the display container at baseWidth
              e.g. 150% zoom → iframe is 960px wide (content reflows) → scaled up to show at 1440px */}
          <div
            className={`relative rounded-xl border border-gray-300 shadow-lg overflow-hidden bg-white ${!isDesktop ? "rounded-[2rem]" : ""}`}
            style={{
              width: iframeWidth,
              height: isDesktop ? iframeWidth * 0.65 : mobileDevice.height,
            }}
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className={`border-0 origin-top-left ${isDragging ? "pointer-events-none" : ""}`}
              style={{
                width: iframeWidth / zoom,
                height: isDesktop ? (iframeWidth * 0.65) / zoom : mobileDevice.height / zoom,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
              title="Layout Preview"
            />

            {/* Drop zones — scaled to match */}
            {isDragging && Object.keys(slotRects).length > 0 && (
              <div className="absolute inset-0">
                {Object.entries(slotRects).map(([slotKey, rect]) => (
                  <SlotDropZone
                    key={slotKey}
                    slotKey={slotKey}
                    rect={rect}
                    zoom={zoom}
                    allowedSlotTypes={slotAllowedTypes[slotKey] ?? []}
                    iframeRef={iframeRef}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
