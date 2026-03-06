import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Dashboard from '@/pages/Dashboard';
import Installed from '@/pages/Installed';
import SkillDetail from '@/pages/SkillDetail';
import Discover from '@/pages/Discover';
import MCPManager from '@/pages/MCPManager';
import MCPDetail from '@/pages/MCPDetail';
import Agents from '@/pages/Agents';
import Settings from '@/pages/Settings';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/stores/settings';

function App() {
  const config = useSettingsStore((state) => state.config);
  const isLoading = useSettingsStore((state) => state.isLoading);
  const fetchConfig = useSettingsStore((state) => state.fetchConfig);

  useEffect(() => {
    if (!config && !isLoading) {
      void fetchConfig();
    }
  }, [config, fetchConfig, isLoading]);

  useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            }
          />
          <Route
            path="/installed"
            element={
              <ErrorBoundary>
                <Installed />
              </ErrorBoundary>
            }
          />
          <Route
            path="/installed/:name"
            element={
              <ErrorBoundary>
                <SkillDetail />
              </ErrorBoundary>
            }
          />
          <Route
            path="/discover"
            element={
              <ErrorBoundary>
                <Discover />
              </ErrorBoundary>
            }
          />
          <Route
            path="/mcp"
            element={
              <ErrorBoundary>
                <MCPManager />
              </ErrorBoundary>
            }
          />
          <Route
            path="/mcp/:id"
            element={
              <ErrorBoundary>
                <MCPDetail />
              </ErrorBoundary>
            }
          />
          <Route
            path="/agents"
            element={
              <ErrorBoundary>
                <Agents />
              </ErrorBoundary>
            }
          />
          <Route
            path="/settings"
            element={
              <ErrorBoundary>
                <Settings />
              </ErrorBoundary>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
