import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import AssetDetail from "./pages/AssetDetail";
import "./App.css";
import AlarmsPage from "./pages/AlarmsPage";
import AssetsPage from "./pages/AssetsPage";
import TagMappingPage from "./pages/TagMappingPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import SetupPage from "./pages/SetupPage";
import PlatformAdminPage from "./pages/PlatformAdminPage";
import ConfiguredEquipmentPage from "./pages/ConfiguredEquipmentPage";
import DemoDashboard from "./pages/DemoDashboard";
import { AuthProvider, useAuth } from "./auth/AuthContext";

function Protected({ platformAdmin = false }: { platformAdmin?: boolean }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-300">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (platformAdmin && user.role !== "SUPER_ADMIN")
    return <Navigate to="/dashboard" replace />;
  if (!platformAdmin && user.role === "SUPER_ADMIN")
    return <Navigate to="/admin" replace />;
  return <Outlet />;
}
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route element={<Protected />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/alarms" element={<AlarmsPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/tag-mapping" element={<TagMappingPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/assets/:assetId" element={<AssetDetail />} />
            <Route
              path="/equipment/:assetId"
              element={<ConfiguredEquipmentPage />}
            />
            <Route path="/demo" element={<DemoDashboard />} />
          </Route>
          <Route element={<Protected platformAdmin />}>
            <Route path="/admin" element={<PlatformAdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
