
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

import Dashboard from "./pages/Dashboard";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import Categories from "./pages/Categories";
import Budgets from "./pages/Budgets";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";

import Groups from "./pages/Groups";
import GroupDetails from "./pages/GroupDetails";
import SharedExpenses from "./pages/SharedExpenses";
import Settlements from "./pages/Settlements";

import DashboardLayout from "./layouts/DashboardLayout";
import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import "./styles/GroupDetailsNavigation.css";

function LoadingScreen() {
  return (
    <div className="app-loading-screen">
      <div className="app-loading-spinner" />
      <p>Loading StudentBudget...</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Navigate
      to={user ? "/dashboard" : "/login"}
      replace
    />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/income" element={<Income />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route
          path="/transactions"
          element={<Transactions />}
        />
        <Route path="/analytics" element={<Analytics />} />
        <Route
          path="/notifications"
          element={<Notifications />}
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />

        <Route path="/groups" element={<Groups />} />
        <Route
          path="/groups/:groupId"
          element={<GroupDetails />}
        />
        <Route
          path="/groups/:groupId/expenses"
          element={<SharedExpenses />}
        />
        <Route
          path="/groups/:groupId/settlements"
          element={<Settlements />}
        />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
