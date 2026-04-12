import { useEffect, useRef } from "react";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { useEditor } from "../contexts/EditorContext";
import { useComponents, useLayouts, useTenants, useCohorts, useRoutes } from "../hooks/useEditorData";
import TenantCohortSelector from "../components/layout-editor/TenantCohortSelector";
import ViewportToggle from "../components/layout-editor/ViewportToggle";
import PublishBar from "../components/layout-editor/PublishBar";
import ComponentPalette from "../components/layout-editor/ComponentPalette";
import LayoutCanvas from "../components/layout-editor/LayoutCanvas";

function refreshPreview() {
  const fn = (window as unknown as Record<string, unknown>).__refreshPreview;
  if (typeof fn === "function") fn();
}

export default function LayoutEditorPage() {
  const editor = useEditor();
  const { data: components = [] } = useComponents();
  const { data: tenants } = useTenants();
  const savedTenantId = editor.savedSelections.tenantId;
  const { data: cohorts } = useCohorts(editor.selectedTenant?.id ?? savedTenantId ?? null);
  const { data: routes } = useRoutes();
  const restored = useRef(false);

  // Restore cached selections once ALL data is available
  useEffect(() => {
    if (restored.current || editor.selectedTenant) return;
    const { tenantId, cohortId, routeId } = editor.savedSelections;
    if (!tenantId || !tenants || !cohorts || !routes) return;

    const tenant = tenants.find((t) => t.id === tenantId);
    const cohort = cohorts.find((c) => c.id === cohortId);
    const route = routes.find((r) => r.id === routeId);

    if (tenant && cohort && route) {
      restored.current = true;
      editor.restoreSelections(tenant, cohort, route);
    }
  }, [tenants, cohorts, routes, editor]);


  const { data: layouts } = useLayouts({
    routeId: editor.selectedRoute?.id,
    tenantId: editor.selectedTenant?.id,
    cohortId: editor.selectedCohort?.id,
    viewport: editor.viewport,
    status: "draft",
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Fallback 1: default cohort's layout for this route
  const defaultCohort = cohorts?.find((c) => c.code === "default");
  const { data: fallbackLayouts } = useLayouts({
    routeId: editor.selectedRoute?.id,
    tenantId: editor.selectedTenant?.id,
    cohortId: defaultCohort?.id,
    viewport: editor.viewport,
    status: "draft",
  });

  // Fallback 2: /my-card route's layout as a template for new routes
  const myCardRoute = routes?.find((r) => r.path === "/my-card");
  const { data: templateLayouts } = useLayouts({
    routeId: myCardRoute?.id,
    tenantId: editor.selectedTenant?.id,
    cohortId: defaultCohort?.id,
    viewport: editor.viewport,
    status: "draft",
  });

  useEffect(() => {
    if (layouts && layouts.length > 0) {
      const draft = layouts[0];
      editor.loadLayout(draft.id, draft.layoutJson);
    } else if (fallbackLayouts && fallbackLayouts.length > 0) {
      const fallback = fallbackLayouts[0];
      editor.loadLayout("", fallback.layoutJson);
    } else if (templateLayouts && templateLayouts.length > 0) {
      // New route with no layout — use my-card as template
      const template = templateLayouts[0];
      editor.loadLayout("", template.layoutJson);
    } else if (
      editor.selectedRoute &&
      editor.selectedTenant &&
      editor.selectedCohort &&
      components.length > 0 &&
      !editor.layoutConfig
    ) {
      editor.createNewLayout(editor.selectedRoute, editor.selectedRoute.slotDefinitions, components);
    }
  }, [layouts, fallbackLayouts, editor.selectedRoute, editor.selectedTenant, editor.selectedCohort, components]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active.data.current || !over?.data.current) return;

    const dragData = active.data.current;
    const dropData = over.data.current;

    if (dragData.type !== "component" || dropData.type !== "slot") return;

    const allowedTypes = dropData.allowedSlotTypes as string[];
    const componentSlotType = dragData.slotType as string;
    if (!allowedTypes.includes(componentSlotType)) return;

    const slotKey = dropData.slotKey as string;

    editor.selectSlot(slotKey);

    await editor.saveSlotChange(
      slotKey,
      dragData.componentCode as string,
      (dragData.defaultProps as Record<string, unknown>) ?? {}
    );
    refreshPreview();
  }

  const slotDefinitions = editor.selectedRoute?.slotDefinitions ?? [];

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <TenantCohortSelector />
        <div className="flex items-center gap-4">
          <ViewportToggle />
          <PublishBar />
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex min-h-0">
          <ComponentPalette components={components} slotDefinitions={slotDefinitions} />
          <LayoutCanvas />
        </div>
        <DragOverlay dropAnimation={null} />
      </DndContext>
    </div>
  );
}
