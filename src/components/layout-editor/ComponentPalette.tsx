import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useEditor } from "../../contexts/EditorContext";
import type { ComponentEntry, SlotDefinition } from "../../hooks/useEditorData";

interface ComponentPaletteProps {
  components: ComponentEntry[];
  slotDefinitions: SlotDefinition[];
}

const SLOT_TYPE_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  dial: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
  info_card: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
  actions_list: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
  recent_activity: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
  sidebar: { bg: "bg-white", border: "border-neutral-200", badge: "bg-neutral-100 text-neutral-700" },
};

const SLOT_TYPE_LABELS: Record<string, string> = {
  dial: "Dial / Gauge",
  info_card: "Info Cards",
  actions_list: "Actions Lists",
  recent_activity: "Recent Activity",
  sidebar: "Navigation",
};

function refreshPreview() {
  const fn = (window as unknown as Record<string, unknown>).__refreshPreview;
  if (typeof fn === "function") fn();
}

function DraggableVariantCard({
  comp,
  isActive,
  tenantCode,
  onApply,
  onPreview,
}: {
  comp: ComponentEntry;
  isActive: boolean;
  tenantCode: string;
  onApply: () => void;
  onPreview: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `component-${comp.code}`,
    data: {
      type: "component",
      componentCode: comp.code,
      slotType: comp.slotType,
      defaultProps: comp.defaultProps ?? {},
    },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999 }
    : undefined;

  const colors = SLOT_TYPE_COLORS[comp.slotType] ?? { bg: "bg-gray-50", border: "border-gray-200", badge: "bg-gray-100 text-gray-700" };
  const previewUrl = `${import.meta.env.VITE_CONSUMER_URL || "http://localhost:5174"}/preview/component?code=${encodeURIComponent(comp.code)}&props=${encodeURIComponent(JSON.stringify(comp.defaultProps ?? {}))}&tenant=${encodeURIComponent(tenantCode)}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-xl overflow-hidden transition-all ${
        isDragging
          ? "opacity-60 shadow-xl ring-2 ring-neutral-400"
          : isActive
          ? "border-black ring-2 ring-neutral-300 shadow-md"
          : `${colors.border} hover:shadow-md hover:-translate-y-0.5`
      }`}
    >
      {/* Mini preview — clickable to zoom */}
      <div
        className="relative h-28 overflow-hidden cursor-pointer bg-[#f5f5f0] group"
        onClick={onPreview}
      >
        <iframe
          src={previewUrl}
          className="w-[250%] h-[250%] border-0 pointer-events-none origin-top-left"
          style={{ transform: "scale(0.4)" }}
          tabIndex={-1}
          title={`Preview: ${comp.name}`}
        />
        {/* Zoom overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2 shadow-lg">
            <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
        {/* Active badge */}
        {isActive && (
          <div className="absolute top-2 right-2 bg-black text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold shadow">
            Active
          </div>
        )}
      </div>

      {/* Info + drag handle + apply */}
      <div className={`flex items-center gap-1 p-2 ${isActive ? "bg-neutral-50" : colors.bg}`}>
        {/* Drag handle */}
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-black/5 shrink-0">
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="4" cy="3" r="1.5" /><circle cx="4" cy="8" r="1.5" /><circle cx="4" cy="13" r="1.5" />
            <circle cx="10" cy="3" r="1.5" /><circle cx="10" cy="8" r="1.5" /><circle cx="10" cy="13" r="1.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium truncate ${isActive ? "text-black" : "text-gray-900"}`}>{comp.name}</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onApply(); }}
          className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors shrink-0 ${
            isActive
              ? "bg-black text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-neutral-400 hover:text-black"
          }`}
        >
          {isActive ? "Active" : "Apply"}
        </button>
      </div>
    </div>
  );
}

export default function ComponentPalette({ components, slotDefinitions }: ComponentPaletteProps) {
  const { layoutConfig, saveSlotChange, selectedSlotKey, selectSlot, viewport, selectedTenant } = useEditor();
  const [saving, setSaving] = useState(false);
  const [previewComp, setPreviewComp] = useState<ComponentEntry | null>(null);

  const viewportSlots = slotDefinitions.filter((s) => s.viewports.includes(viewport));

  const selectedSlotDef = selectedSlotKey
    ? viewportSlots.find((s) => s.slotKey === selectedSlotKey)
    : null;

  const allowedComponents = selectedSlotDef
    ? components.filter((c) => selectedSlotDef.allowedSlotTypes.includes(c.slotType))
    : [];

  const currentComponentCode = selectedSlotKey && layoutConfig
    ? layoutConfig.slots[selectedSlotKey]?.componentCode ?? null
    : null;

  async function handleApplyComponent(comp: ComponentEntry) {
    if (!selectedSlotKey) return;
    setSaving(true);
    await saveSlotChange(selectedSlotKey, comp.code, comp.defaultProps ?? {});
    setSaving(false);
    refreshPreview();
  }

  // No slot selected — show empty state
  if (!selectedSlotKey || !selectedSlotDef) {
    return (
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col items-center justify-center p-8">
        <svg className="w-10 h-10 text-neutral-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
        </svg>
        <p className="text-sm font-medium text-neutral-500 text-center">Click on a block in the preview to see its variants</p>
        <p className="text-xs text-neutral-400 text-center mt-1.5">Or drag a variant onto any block</p>
      </div>
    );
  }

  // Slot selected — variant picker with mini previews
  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{selectedSlotDef.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Click preview to zoom, drag to canvas</p>
          </div>
          <button
            onClick={() => selectSlot(null)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {saving && (
          <div className="text-center py-2 text-xs text-black font-medium animate-pulse">
            Saving & refreshing...
          </div>
        )}
        {allowedComponents.map((comp) => (
          <DraggableVariantCard
            key={comp.code}
            comp={comp}
            isActive={comp.code === currentComponentCode}
            tenantCode={selectedTenant?.code ?? "kaiser"}
            onApply={() => handleApplyComponent(comp)}
            onPreview={() => setPreviewComp(comp)}
          />
        ))}
      </div>

      {/* Zoom modal */}
      {previewComp && (
        <PreviewModal
          component={previewComp}
          tenantCode={selectedTenant?.code ?? "kaiser"}
          onClose={() => setPreviewComp(null)}
          onApply={() => {
            handleApplyComponent(previewComp);
            setPreviewComp(null);
          }}
        />
      )}
    </div>
  );
}

function PreviewModal({
  component,
  tenantCode,
  onClose,
  onApply,
}: {
  component: ComponentEntry;
  tenantCode: string;
  onClose: () => void;
  onApply: () => void;
}) {
  const previewUrl = `${import.meta.env.VITE_CONSUMER_URL || "http://localhost:5174"}/preview/component?code=${encodeURIComponent(component.code)}&props=${encodeURIComponent(JSON.stringify(component.defaultProps ?? {}))}&tenant=${encodeURIComponent(tenantCode)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-[640px] max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{component.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{component.description}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-gray-50 p-6">
          <div className="bg-[#f5f5f0] rounded-xl border border-gray-200 overflow-hidden" style={{ height: 350 }}>
            <iframe src={previewUrl} className="w-full h-full border-0" title={`Preview: ${component.name}`} />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium">{component.slotType}</span>
            <span className="text-xs text-gray-400">{component.code}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={onApply} className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-neutral-800 font-medium">
              Use this component
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
