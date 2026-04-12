import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";
import Auth0ProviderWithConfig from "./auth/Auth0Provider";
import ProtectedRoute from "./auth/ProtectedRoute";
import { EditorProvider } from "./contexts/EditorContext";
import LayoutEditorPage from "./pages/LayoutEditorPage";
import V2EditorPage from "./pages/V2EditorPage";
import { setAuthToken } from "./services/api";

const queryClient = new QueryClient();

function AppContent() {
  const { getAccessTokenSilently, isAuthenticated, logout, user } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      getAccessTokenSilently().then(setAuthToken).catch(console.error);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Console Header */}
      <header className="bg-black text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span className="text-base font-semibold tracking-tight">Sunny FLEX</span>
          <span className="text-xs text-neutral-400 border border-neutral-700 rounded px-1.5 py-0.5 ml-1">Console</span>
          {/* Nav hidden — /v2 accessible via direct URL only */}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-400">{user?.email}</span>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <Routes>
          <Route path="/" element={<LayoutEditorPage />} />
          <Route path="/v2" element={<V2EditorPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Auth0ProviderWithConfig>
        <QueryClientProvider client={queryClient}>
          <ProtectedRoute>
            <EditorProvider>
              <AppContent />
            </EditorProvider>
          </ProtectedRoute>
        </QueryClientProvider>
      </Auth0ProviderWithConfig>
    </BrowserRouter>
  );
}
