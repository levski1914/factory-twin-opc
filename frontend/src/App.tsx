import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import AssetDetail from "./pages/AssetDetail";
import "./App.css";
import AlarmsPage from "./pages/AlarmsPage";
import AssetsPage from "./pages/AssetsPage";
import TagMappingPage from "./pages/TagMappingPage";
import IntegrationsPage from "./pages/IntegrationsPage";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/alarms" element={<AlarmsPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/tag-mapping" element={<TagMappingPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
        <Route path="/assets/:assetId" element={<AssetDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
