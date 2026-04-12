import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useEditor } from "../../contexts/EditorContext";

function ConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-neutral-700" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center">Publish changes?</h3>
          <p className="text-sm text-gray-500 text-center mt-2">
            This will make your current layout live for all users of this tenant and cohort. This action cannot be undone.
          </p>
        </div>
        <div className="flex border-t border-gray-100">
          <button onClick={onCancel} className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-3 text-sm font-medium text-white bg-black hover:bg-neutral-800 transition-colors">
            Yes, publish
          </button>
        </div>
      </div>
    </div>
  );
}

// Emit a toast event that the toolbar bar can listen to
export function emitToast(message: string) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: message }));
}

export default function PublishBar() {
  const { isPublishing, publish, layoutId, layoutConfig } = useEditor();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!layoutId && !layoutConfig) return null;

  async function handlePublish() {
    setShowConfirm(false);
    await publish();
    emitToast("Layout published successfully");
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <button
          className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          onClick={() => setShowConfirm(true)}
          disabled={isPublishing}
        >
          {isPublishing ? "Publishing..." : "Publish"}
        </button>
      </div>

      {showConfirm && (
        <ConfirmDialog onConfirm={handlePublish} onCancel={() => setShowConfirm(false)} />
      )}
    </>
  );
}
