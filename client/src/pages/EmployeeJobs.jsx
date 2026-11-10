import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import Layout from "../components/Layout.jsx";

const STATUS_META = {
  pending: { cls: "badge-pending", label: "Pending" },
  in_progress: { cls: "badge-progress", label: "In Progress" },
  completed: { cls: "badge-completed", label: "Completed" },
};

export default function EmployeeJobs() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/work-orders").then((data) => {
      setWorkOrders(data.workOrders);
      setLoading(false);
    });
  }, []);

  return (
    <Layout>
      <div className="dashboard">
        <div className="page-header">
          <h1>My Jobs</h1>
        </div>
        {loading ? (
          <div className="loading">Loading…</div>
        ) : workOrders.length === 0 ? (
          <div className="empty-state">
            <p>No jobs assigned to you yet.</p>
          </div>
        ) : (
          <div className="wo-list">
            {workOrders.map((wo) => {
              const m = STATUS_META[wo.status] || STATUS_META.pending;
              return (
                <Link to={`/employee/work-orders/${wo.id}`} key={wo.id} className="wo-card">
                  <div className="wo-card-top">
                    <h3>{wo.title}</h3>
                    <span className={`badge ${m.cls}`}>{m.label}</span>
                  </div>
                  <p className="wo-address">📍 {wo.property_address}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
