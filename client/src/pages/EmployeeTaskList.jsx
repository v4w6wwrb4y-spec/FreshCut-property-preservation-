import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import Layout from "../components/Layout.jsx";
import PhotoTimeline from "../components/PhotoTimeline.jsx";

export default function EmployeeTaskList() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = () => {
    api.get(`/work-orders/${id}`).then((d) => {
      setData(d);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [id]);

  const toggleTask = async (task) => {
    setError("");
    try {
      await api.patch(`/tasks/${task.id}`, { completed: !task.completed });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePhoto = async (e, task) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(task.id);
    setError("");
    setSuccess("");
    try {
      let lat = null, lon = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = String(pos.coords.latitude);
          lon = String(pos.coords.longitude);
        } catch { /* GPS optional */ }
      }
      const fd = new FormData();
      fd.append("photo", file);
      fd.append("task_id", task.id);
      fd.append("work_order_id", id);
      fd.append("latitude", lat || "");
      fd.append("longitude", lon || "");
      await api.upload("/photos", fd);
      setSuccess("Photo uploaded — task marked complete!");
      load();
    } catch (err) {
      setError("Failed to upload photo: " + err.message);
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <Layout><div className="loading">Loading…</div></Layout>;
  const { workOrder, tasks, photos } = data;
  const taskPhotos = (taskId) => photos.filter((p) => p.task_id === taskId);
  const completedCount = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <Layout>
      <div className="page-container">
        <Link to="/employee" className="back-link">← Back to My Jobs</Link>
        <div className="detail-header">
          <div>
            <h1>{workOrder.title}</h1>
            <p className="wo-address">📍 {workOrder.property_address}</p>
          </div>
        </div>

        <div className="progress-section">
          <div className="progress-header-row">
            <span>{completedCount} of {tasks.length} tasks complete</span>
            <span className="progress-pct">{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <PhotoTimeline key={id} photos={photos} tasks={tasks} />

        <div className="task-list-section">
          {tasks.map((task, i) => {
            const tps = taskPhotos(task.id);
            return (
              <div key={task.id} className={`task-card ${task.completed ? "done" : ""}`}>
                <div className="task-card-top">
                  <div className={`task-step ${task.completed ? "checked" : ""}`}>
                    {task.completed ? "✓" : i + 1}
                  </div>
                  <div className="task-info">
                    <h3 className={task.completed ? "done-text" : ""}>{task.title}</h3>
                    {task.description && <p>{task.description}</p>}
                    {task.requires_photo && <span className="photo-tag">📸 Photo Required</span>}
                  </div>
                  {!task.requires_photo && (
                    <button
                      onClick={() => toggleTask(task)}
                      className={task.completed ? "btn-done" : "btn-primary btn-sm"}
                    >
                      {task.completed ? "✓ Done" : "Mark Done"}
                    </button>
                  )}
                </div>

                {task.requires_photo && (
                  <div className="photo-section">
                    {tps.length > 0 ? (
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
                    ) : (
                      <label className={`upload-btn ${uploading === task.id ? "uploading" : ""}`}>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handlePhoto(e, task)}
                          style={{ display: "none" }}
                        />
                        {uploading === task.id ? "Uploading…" : "📸 Capture Photo"}
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {completedCount === tasks.length && tasks.length > 0 && (
          <div className="completion-banner">
            ✅ All tasks complete! This work order is ready for manager review.
          </div>
        )}
      </div>
    </Layout>
  );
}
