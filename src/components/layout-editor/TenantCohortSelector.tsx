import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useTenants, useCohorts, useRoutes } from "../../hooks/useEditorData";
import type { RouteConfig } from "../../hooks/useEditorData";

export default function TenantCohortSelector() {
  const editor = useEditor();
  const { data: tenants } = useTenants();
  const { data: cohorts } = useCohorts(editor.selectedTenant?.id ?? null);
  const { data: routes } = useRoutes();
  const [pendingRoute, setPendingRoute] = useState<RouteConfig | null>(null);

  function handleRouteChange(routeId: string) {
    const route = routes?.find((r) => r.id === routeId) ?? null;
    if (editor.draftEdited) {
      setPendingRoute(route);
    } else {
      editor.setRoute(route);
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Tenant</label>
          <select
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px] text-black focus:outline-none focus:ring-2 focus:ring-black/10"
            value={editor.selectedTenant?.id ?? ""}
            onChange={(e) => {
              const tenant = tenants?.find((t) => t.id === e.target.value) ?? null;
              editor.setTenant(tenant);
            }}
          >
            <option value="">Select tenant...</option>
            {tenants?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Cohort</label>
          <select
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[140px] text-black focus:outline-none focus:ring-2 focus:ring-black/10"
            value={editor.selectedCohort?.id ?? ""}
            onChange={(e) => {
              const cohort = cohorts?.find((c) => c.id === e.target.value) ?? null;
              editor.setCohort(cohort);
            }}
            disabled={!editor.selectedTenant}
          >
            <option value="">Select cohort...</option>
            {cohorts?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Route</label>
          <select
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[140px] text-black focus:outline-none focus:ring-2 focus:ring-black/10"
            value={editor.selectedRoute?.id ?? ""}
            onChange={(e) => handleRouteChange(e.target.value)}
          >
            <option value="">Select route...</option>
            {routes?.map((r) => (
              <option key={r.id} value={r.id}>{r.name} ({r.path})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Unpublished changes warning */}
      {pendingRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setPendingRoute(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[380px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 text-center">Unpublished changes</h3>
              <p className="text-sm text-gray-500 text-center mt-1.5">
                You have unpublished edits on <span className="font-medium text-gray-700">{editor.selectedRoute?.name}</span>. Switching to <span className="font-medium text-gray-700">{pendingRoute.name}</span> will lose these changes unless you publish first.
              </p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onClick={() => {
                  editor.setRoute(pendingRoute);
                  setPendingRoute(null);
                }}
                className="flex-1 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Discard & switch
              </button>
              <button
                onClick={() => setPendingRoute(null)}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-black hover:bg-neutral-800 transition-colors"
              >
                Stay & publish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
