import { useEditor } from "../../contexts/EditorContext";

export default function ViewportToggle() {
  const { viewport, setViewport } = useEditor();

  return (
    <div className="flex items-center bg-neutral-100 border border-neutral-200 rounded-lg p-0.5">
      <button
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewport === "desktop"
            ? "bg-white text-black shadow-sm"
            : "text-neutral-500 hover:text-black"
        }`}
        onClick={() => setViewport("desktop")}
      >
        Desktop
      </button>
      <button
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewport === "mobile"
            ? "bg-white text-black shadow-sm"
            : "text-neutral-500 hover:text-black"
        }`}
        onClick={() => setViewport("mobile")}
      >
        Mobile
      </button>
    </div>
  );
}
