import { Routes, Route, Navigate } from "react-router-dom";
import AnAdminSidebar from "./components/an_admin_sidebar";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/users";
import Settings from "./pages/settings";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import Payments from "./pages/payments";
import Notifications from "./pages/Notifications";
import AdminLogin from "./pages/AdminLogin";
import Report from "./pages/Report";


const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? (
    <div className="dashboard-layout-container"> {/* 👈 Important flex container */}
      <AnAdminSidebar />
      <main className="dashboard-main-wrapper">{children}</main>
    </div>
  ) : (
    <Navigate to="/admin-login" />
  );
};

export default function App() {
  return (
    <Routes>
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
