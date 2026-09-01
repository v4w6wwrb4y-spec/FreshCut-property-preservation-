import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import Layout from "../components/Layout.jsx";

const STATUS_META = {
  pending: { cls: "badge-pending", label: "Pending" },
  in_progress: { cls: "badge-progress", label: "In Progress" },
  completed: { cls: "badge-completed", label: "Completed" },
};

function Badge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return <span className={`badge ${m.cls}`}>{m.label}</span>;
}

export default function ManagerDashboard() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/work-orders").then((data) => {
      setWorkOrders(data.workOrders);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? workOrders : workOrders.filter((w) => w.status === filter);
  const stats = {
    total: workOrders.length,
    pending: workOrders.filter((w) => w.status === "pending").length,
    inProgress: workOrders.filter((w) => w.status === "in_progress").length,
    completed: workOrders.filter((w) => w.status === "completed").length,
  };

  return (
    <Layout>
      <div className="dashboard">
        <div className="page-header">
          <h1>Dashboard</h1>
          <Link to="/manager/work-orders/new" className="btn-primary">+ New Work Order</Link>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><span className="stat-value">{stats.total}</span><span className="stat-label">Total</span></div>
          <div className="stat-card stat-pending"><span className="stat-value">{stats.pending}</span><span className="stat-label">Pending</span></div>
          <div className="stat-card stat-progress"><span className="stat-value">{stats.inProgress}</span><span className="stat-label">In Progress</span></div>
          <div className="stat-card stat-done"><span className="stat-value">{stats.completed}</span><span className="stat-label">Completed</span></div>
        </div>

        <div className="filter-tabs">
          {["all", "pending", "in_progress", "completed"].map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : STATUS_META[f].label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>No work orders here.</p>
            <Link to="/manager/work-orders/new" className="btn-primary">Create your first work order</Link>
          </div>
        ) : (
          <div className="wo-list">
            {filtered.map((wo) => {
              const done = wo.tasks_done || 0;
              const total = wo.task_count || 0;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <Link to={`/manager/work-orders/${wo.id}`} key={wo.id} className="wo-card">
                  <div className="wo-card-top">
                    <h3>{wo.title}</h3>
                    <Badge status={wo.status} />
                  </div>
                  <p className="wo-address">📍 {wo.property_address}</p>
                  <div className="wo-card-progress">
                    <div className="wo-progress-row">
                      <span>{done} of {total} tasks</span>
                      <span className="wo-progress-pct">{pct}%</span>
                    </div>
                    <div className="wo-progress-bar">
                      <div className="wo-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="wo-card-bottom">
                    <span>{wo.assigned_name ? `👷 ${wo.assigned_name}` : "Unassigned"}</span>
                    <span className="wo-date">{new Date(wo.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
