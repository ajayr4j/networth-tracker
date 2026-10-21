import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RequireWorkspace } from "./components/RequireWorkspace";
import { useAuth } from "./context/AuthContext";
import { useWorkspace } from "./context/WorkspaceContext";
import { Dashboard } from "./pages/Dashboard";
import { Holdings } from "./pages/Holdings";
import { Login } from "./pages/Login";
import { Projections } from "./pages/Projections";
import { Register } from "./pages/Register";
import { Timeline } from "./pages/Timeline";
import { WorkspaceOnboarding } from "./pages/WorkspaceOnboarding";

function Root() {
  const { user, isLoading: authLoading } = useAuth();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();

  if (authLoading || (user && workspaceLoading)) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={workspace ? "/dashboard" : "/onboarding"} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <WorkspaceOnboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RequireWorkspace>
              <Dashboard />
            </RequireWorkspace>
          </ProtectedRoute>
        }
      />
      <Route
        path="/holdings"
        element={
          <ProtectedRoute>
            <RequireWorkspace>
              <Holdings />
            </RequireWorkspace>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projections"
        element={
          <ProtectedRoute>
            <RequireWorkspace>
              <Projections />
            </RequireWorkspace>
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeline"
        element={
          <ProtectedRoute>
            <RequireWorkspace>
              <Timeline />
            </RequireWorkspace>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
