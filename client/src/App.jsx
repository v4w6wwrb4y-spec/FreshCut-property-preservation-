import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import CreateWorkOrder from "./pages/CreateWorkOrder.jsx";
import WorkOrderDetail from "./pages/WorkOrderDetail.jsx";
import EmployeeJobs from "./pages/EmployeeJobs.jsx";
import EmployeeTaskList from "./pages/EmployeeTaskList.jsx";

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role)
    return <Navigate to={user.role === "manager" ? "/manager" : "/employee"} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/manager" element={<Protected role="manager"><ManagerDashboard /></Protected>} />
      <Route path="/manager/work-orders/new" element={<Protected role="manager"><CreateWorkOrder /></Protected>} />
      <Route path="/manager/work-orders/:id" element={<Protected role="manager"><WorkOrderDetail /></Protected>} />
      <Route path="/employee" element={<Protected role="employee"><EmployeeJobs /></Protected>} />
      <Route path="/employee/work-orders/:id" element={<Protected role="employee"><EmployeeTaskList /></Protected>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
