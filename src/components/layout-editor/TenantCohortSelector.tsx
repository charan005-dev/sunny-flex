import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";
import { useTenants, useCohorts, useRoutes } from "../../hooks/useEditorData";
import type { RouteConfig } from "../../hooks/useEditorData";
import api from "../../services/api";

export default function TenantCohortSelector() {
  const editor = useEditor();
  const { data: tenants } = useTenants();
  const { data: cohorts, refetch: refetchCohorts } = useCohorts(editor.selectedTenant?.id ?? null);
  const { data: routes, refetch: refetchRoutes } = useRoutes();
  const [pendingRoute, setPendingRoute] = useState<RouteConfig | null>(null);
  const [showNewSegment, setShowNewSegment] = useState(false);
  const [showNewRoute, setShowNewRoute] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState("");
  const [newRouteName, setNewRouteName] = useState("");
  const [newRoutePath, setNewRoutePath] = useState("");
  const [creating, setCreating] = useState(false);

  function handleRouteChange(routeId: string) {
    if (routeId === "__new__") {
      setShowNewRoute(true);
      return;
    }
    const route = routes?.find((r) => r.id === routeId) ?? null;
    if (editor.draftEdited) {
      setPendingRoute(route);
    } else {
      editor.setRoute(route);
    }
  }

  function handleSegmentChange(cohortId: string) {
    if (cohortId === "__new__") {
      setShowNewSegment(true);
      return;
    }
    const cohort = cohorts?.find((c) => c.id === cohortId) ?? null;
    editor.setCohort(cohort);
  }

  async function createSegment() {
    if (!newSegmentName.trim() || !editor.selectedTenant) return;
    setCreating(true);
    try {
      const code = newSegmentName.trim().toLowerCase().replace(/\s+/g, "_");
      await api.post(`/tenants/${editor.selectedTenant.id}/cohorts`, {
        code,
        name: newSegmentName.trim(),
      });
      await refetchCohorts();
      setNewSegmentName("");
      setShowNewSegment(false);
    } catch (err) {
      console.error("Failed to create segment:", err);
    }
    setCreating(false);
  }

  async function createRoute() {
    if (!newRouteName.trim() || !newRoutePath.trim()) return;
    setCreating(true);
    try {
      const path = newRoutePath.trim().startsWith("/") ? newRoutePath.trim() : `/${newRoutePath.trim()}`;
      await api.post("/routes", {
        path,
        name: newRouteName.trim(),
        description: "",
      });
      await refetchRoutes();
      setNewRouteName("");
      setNewRoutePath("");
      setShowNewRoute(false);
    } catch (err) {
      console.error("Failed to create route:", err);
    }
    setCreating(false);
  }

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Tenant */}
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

        {/* Segment (formerly Cohort) */}
        <div>
          <label className="block text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Segment</label>
          <select
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[140px] text-black focus:outline-none focus:ring-2 focus:ring-black/10"
            value={editor.selectedCohort?.id ?? ""}
            onChange={(e) => handleSegmentChange(e.target.value)}
            disabled={!editor.selectedTenant}
          >
            <option value="">Select segment...</option>
            {cohorts?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {editor.selectedTenant && <option value="__new__">+ New segment</option>}
          </select>
        </div>

        {/* Route */}
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
            <option value="__new__">+ New route</option>
          </select>
        </div>
      </div>

      {/* New Segment Modal */}
      {showNewSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowNewSegment(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[360px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <h3 className="text-base font-semibold text-gray-900">New Segment</h3>
              <p className="text-xs text-gray-400 mt-1">Create a new user segment for {editor.selectedTenant?.name}</p>
              <input
                autoFocus
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createSegment()}
                placeholder="e.g. Gen Alpha"
                className="w-full mt-3 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={() => setShowNewSegment(false)} className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={createSegment} disabled={creating || !newSegmentName.trim()}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-black hover:bg-neutral-800 disabled:opacity-50">
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Route Modal */}
      {showNewRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowNewRoute(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-[360px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5">
              <h3 className="text-base font-semibold text-gray-900">New Route</h3>
              <p className="text-xs text-gray-400 mt-1">Create a new page route</p>
              <input
                autoFocus
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                placeholder="e.g. Shop"
                className="w-full mt-3 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <input
                value={newRoutePath}
                onChange={(e) => setNewRoutePath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoute()}
                placeholder="e.g. /shop"
                className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 font-mono"
              />
            </div>
            <div className="flex border-t border-gray-100">
              <button onClick={() => setShowNewRoute(false)} className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={createRoute} disabled={creating || !newRouteName.trim() || !newRoutePath.trim()}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-black hover:bg-neutral-800 disabled:opacity-50">
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={() => { editor.setRoute(pendingRoute); setPendingRoute(null); }}
                className="flex-1 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                Discard & switch
              </button>
              <button onClick={() => setPendingRoute(null)}
                className="flex-1 px-4 py-3 text-sm font-medium text-white bg-black hover:bg-neutral-800 transition-colors">
                Stay & publish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
