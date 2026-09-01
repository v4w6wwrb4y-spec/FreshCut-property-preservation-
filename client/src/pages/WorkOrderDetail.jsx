import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";
import Layout from "../components/Layout.jsx";

const STATUS_META = {
  pending: { cls: "badge-pending", label: "Pending" },
  in_progress: { cls: "badge-progress", label: "In Progress" },
  completed: { cls: "badge-completed", label: "Completed" },
};

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get(`/work-orders/${id}`).then((d) => {
      setData(d);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = async () => {
    if (!confirm("Delete this work order? This cannot be undone.")) return;
    await api.delete(`/work-orders/${id}`);
    navigate("/manager");
  };

  if (loading) return <Layout><div className="loading">Loading…</div></Layout>;
  const { workOrder, tasks, photos } = data;
  const m = STATUS_META[workOrder.status] || STATUS_META.pending;
  const completedCount = tasks.filter((t) => t.completed).length;
  const taskPhotos = (taskId) => photos.filter((p) => p.task_id === taskId);

  return (
    <Layout>
      <div className="page-container">
        <Link to="/manager" className="back-link">← Back to Dashboard</Link>
        <div className="detail-header">
          <div>
            <h1>{workOrder.title}</h1>
            <span className={`badge ${m.cls}`}>{m.label}</span>
          </div>
          <button onClick={handleDelete} className="btn-danger">Delete</button>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Property Address</span>
            <span className="info-value">{workOrder.property_address}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Assigned To</span>
            <span className="info-value">{workOrder.assigned_name || "Unassigned"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Created By</span>
            <span className="info-value">{workOrder.created_name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Created</span>
            <span className="info-value">{new Date(workOrder.created_at).toLocaleString()}</span>
          </div>
        </div>

        {workOrder.description && (
          <div className="info-block">
            <h3>Description</h3>
            <p>{workOrder.description}</p>
          </div>
        )}

        <div className="task-list-section">
          <h3>Tasks ({completedCount}/{tasks.length} complete)</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }} />
          </div>
          {tasks.map((task, i) => {
            const tps = taskPhotos(task.id);
            return (
              <div key={task.id} className={`task-row ${task.completed ? "done" : ""}`}>
                <div className={`task-check ${task.completed ? "checked" : ""}`}>
                  {task.completed ? "✓" : i + 1}
                </div>
                <div className="task-body">
                  <div className="task-title">{task.title}</div>
                  {task.description && <div className="task-desc">{task.description}</div>}
                  {task.requires_photo && <span className="photo-tag">📸 Photo Required</span>}
                  {tps.length > 0 && (
                    <div className="photo-gallery">
                      {tps.map((p) => (
                        <div key={p.id} className="photo-item">
                          <img src={`/api/uploads/${p.file_path}`} alt="Task proof" />
                          {p.latitude && p.longitude && (
                            <span className="gps-label">📍 {p.latitude}, {p.longitude}</span>
                          )}
                          <span className="time-label">🕐 {new Date(p.captured_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
