import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../services/api";
import type { LayoutConfig, SlotDefinition, ComponentEntry, Tenant, Cohort, RouteConfig } from "../hooks/useEditorData";

const STORAGE_KEY = "app-builder-selections";

interface SavedSelections {
  tenantId?: string;
  cohortId?: string;
  routeId?: string;
  viewport?: "desktop" | "mobile";
}

function loadSelections(): SavedSelections {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSelections(s: SavedSelections) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface EditorState {
  selectedTenant: Tenant | null;
  selectedCohort: Cohort | null;
  selectedRoute: RouteConfig | null;
  viewport: "desktop" | "mobile";
  layoutId: string | null;
  layoutConfig: LayoutConfig | null;
  isDirty: boolean;
  draftEdited: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  selectedSlotKey: string | null;
}

interface EditorContextType extends EditorState {
  setTenant: (t: Tenant | null) => void;
  setCohort: (c: Cohort | null) => void;
  setRoute: (r: RouteConfig | null) => void;
  setViewport: (v: "desktop" | "mobile") => void;
  loadLayout: (layoutId: string, config: LayoutConfig) => void;
  updateSlot: (slotKey: string, componentCode: string, defaultProps: Record<string, unknown>) => void;
  removeSlot: (slotKey: string) => void;
  selectSlot: (slotKey: string | null) => void;
  saveDraft: () => Promise<void>;
  saveSlotChange: (slotKey: string, componentCode: string, defaultProps: Record<string, unknown>) => Promise<void>;
  publish: () => Promise<void>;
  createNewLayout: (routeConfig: RouteConfig, slots: SlotDefinition[], components: ComponentEntry[]) => void;
  restoreSelections: (tenant: Tenant, cohort: Cohort, route: RouteConfig) => void;
  savedSelections: SavedSelections;
}

const EditorContext = createContext<EditorContextType | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const saved = loadSelections();

  const [state, setState] = useState<EditorState>({
    selectedTenant: null,
    selectedCohort: null,
    selectedRoute: null,
    viewport: saved.viewport ?? "desktop",
    layoutId: null,
    layoutConfig: null,
    isDirty: false,
    draftEdited: false,
    isSaving: false,
    isPublishing: false,
    selectedSlotKey: null,
  });

  // Ref to always have latest state for async operations
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist selections to sessionStorage
  useEffect(() => {
    saveSelections({
      tenantId: state.selectedTenant?.id,
      cohortId: state.selectedCohort?.id,
      routeId: state.selectedRoute?.id,
      viewport: state.viewport,
    });
  }, [state.selectedTenant, state.selectedCohort, state.selectedRoute, state.viewport]);

  const selectSlot = useCallback((slotKey: string | null) => {
    setState((s) => ({ ...s, selectedSlotKey: slotKey }));
  }, []);

  const setTenant = useCallback((t: Tenant | null) => {
    setState((s) => ({ ...s, selectedTenant: t, selectedCohort: null, layoutId: null, layoutConfig: null, isDirty: false, selectedSlotKey: null }));
  }, []);

  const setCohort = useCallback((c: Cohort | null) => {
    setState((s) => ({ ...s, selectedCohort: c, layoutId: null, layoutConfig: null, isDirty: false }));
  }, []);

  const setRoute = useCallback((r: RouteConfig | null) => {
    setState((s) => ({ ...s, selectedRoute: r, layoutId: null, layoutConfig: null, isDirty: false, draftEdited: false, selectedSlotKey: null }));
  }, []);

  const setViewport = useCallback((v: "desktop" | "mobile") => {
    setState((s) => ({ ...s, viewport: v, layoutId: null, layoutConfig: null, isDirty: false }));
  }, []);

  // Restore all selections at once — no cascading clears
  const restoreSelections = useCallback((tenant: Tenant, cohort: Cohort, route: RouteConfig) => {
    setState((s) => ({
      ...s,
      selectedTenant: tenant,
      selectedCohort: cohort,
      selectedRoute: route,
      layoutId: null,
      layoutConfig: null,
      isDirty: false,
      selectedSlotKey: null,
    }));
  }, []);

  const loadLayout = useCallback((layoutId: string, config: LayoutConfig) => {
    setState((s) => ({ ...s, layoutId, layoutConfig: config, isDirty: false }));
  }, []);

  const updateSlot = useCallback((slotKey: string, componentCode: string, defaultProps: Record<string, unknown>) => {
    setState((s) => {
      if (!s.layoutConfig) return s;
      const existingSlot = s.layoutConfig.slots[slotKey];
      return {
        ...s,
        isDirty: true,
        layoutConfig: {
          ...s.layoutConfig,
          slots: {
            ...s.layoutConfig.slots,
            [slotKey]: {
              componentCode,
              gridArea: existingSlot?.gridArea ?? slotKey,
              props: defaultProps,
            },
          },
        },
      };
    });
  }, []);

  const removeSlot = useCallback((slotKey: string) => {
    setState((s) => {
      if (!s.layoutConfig) return s;
      const newSlots = { ...s.layoutConfig.slots };
      delete newSlots[slotKey];
      return {
        ...s,
        isDirty: true,
        layoutConfig: { ...s.layoutConfig, slots: newSlots },
      };
    });
  }, []);

  // Save using the ref so we always get latest state
  const saveDraft = useCallback(async () => {
    const s = stateRef.current;
    if (!s.layoutConfig) return;
    setState((prev) => ({ ...prev, isSaving: true }));
    try {
      if (s.layoutId) {
        await api.put(`/layouts/${s.layoutId}`, { layoutJson: s.layoutConfig });
      } else if (s.selectedRoute && s.selectedTenant && s.selectedCohort) {
        const res = await api.post("/layouts", {
          routeId: s.selectedRoute.id,
          tenantId: s.selectedTenant.id,
          cohortId: s.selectedCohort.id,
          viewport: s.viewport,
          layoutJson: s.layoutConfig,
        });
        setState((prev) => ({ ...prev, layoutId: res.data.data.id }));
      }
      setState((prev) => ({ ...prev, isDirty: false, isSaving: false }));
    } catch (err) {
      console.error("Save failed:", err);
      setState((prev) => ({ ...prev, isSaving: false }));
    }
  }, []);

  // Atomically update a slot AND save — no race condition
  const saveSlotChange = useCallback(async (slotKey: string, componentCode: string, defaultProps: Record<string, unknown>) => {
    const s = stateRef.current;
    if (!s.layoutConfig) return;

    const existingSlot = s.layoutConfig.slots[slotKey];
    const newConfig: LayoutConfig = {
      ...s.layoutConfig,
      slots: {
        ...s.layoutConfig.slots,
        [slotKey]: {
          componentCode,
          gridArea: existingSlot?.gridArea ?? slotKey,
          props: defaultProps,
        },
      },
    };

    // Update state immediately
    setState((prev) => ({ ...prev, layoutConfig: newConfig, isDirty: false, draftEdited: true, isSaving: true }));

    // Save to API with the new config directly
    try {
      if (s.layoutId) {
        await api.put(`/layouts/${s.layoutId}`, { layoutJson: newConfig });
      } else if (s.selectedRoute && s.selectedTenant && s.selectedCohort) {
        const res = await api.post("/layouts", {
          routeId: s.selectedRoute.id,
          tenantId: s.selectedTenant.id,
          cohortId: s.selectedCohort.id,
          viewport: s.viewport,
          layoutJson: newConfig,
        });
        setState((prev) => ({ ...prev, layoutId: res.data.data.id }));
      }
      setState((prev) => ({ ...prev, isSaving: false }));
    } catch (err) {
      console.error("Save failed:", err);
      setState((prev) => ({ ...prev, isSaving: false }));
    }
  }, []);

  const publish = useCallback(async () => {
    const s = stateRef.current;
    if (!s.layoutId) return;
    setState((prev) => ({ ...prev, isPublishing: true }));
    try {
      if (s.isDirty && s.layoutConfig) {
        await api.put(`/layouts/${s.layoutId}`, { layoutJson: s.layoutConfig });
      }
      await api.post(`/layouts/${s.layoutId}/publish`);
      setState((prev) => ({ ...prev, isDirty: false, draftEdited: false, isPublishing: false }));
    } catch (err) {
      console.error("Publish failed:", err);
      setState((prev) => ({ ...prev, isPublishing: false }));
    }
  }, []);

  const createNewLayout = useCallback((routeConfig: RouteConfig, slots: SlotDefinition[], components: ComponentEntry[]) => {
    const s = stateRef.current;
    const viewportSlots = slots.filter((sl) => sl.viewports.includes(s.viewport));
    const isDesktop = s.viewport === "desktop";

    const slotEntries: Record<string, { componentCode: string; gridArea: string; props: Record<string, unknown> }> = {};
    for (const slot of viewportSlots) {
      const matchingComp = components.find((c) => slot.allowedSlotTypes.includes(c.slotType));
      if (matchingComp) {
        slotEntries[slot.slotKey] = {
          componentCode: matchingComp.code,
          gridArea: slot.slotKey === "actions_list" ? "actions" : slot.slotKey,
          props: matchingComp.defaultProps ?? {},
        };
      }
    }

    const config: LayoutConfig = {
      routePath: routeConfig.path,
      viewport: s.viewport,
      gridTemplate: isDesktop
        ? { columns: "240px 1fr 360px", rows: "auto auto 1fr", gap: "24px", areas: ["sidebar dial actions", "sidebar info_card actions", "sidebar recent_activity recent_activity"] }
        : { columns: "1fr", rows: "auto auto auto auto auto", gap: "16px", areas: ["dial", "info_card", "actions", "recent_activity", "bottom_nav"] },
      slots: slotEntries,
    };

    setState((prev) => ({ ...prev, layoutConfig: config, isDirty: true }));
  }, []);

  return (
    <EditorContext.Provider
      value={{
        ...state,
        setTenant, setCohort, setRoute, setViewport,
        loadLayout, updateSlot, removeSlot, selectSlot,
        saveDraft, saveSlotChange, publish, createNewLayout,
        restoreSelections, savedSelections: saved,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
