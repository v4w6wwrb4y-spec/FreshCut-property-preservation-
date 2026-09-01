import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import Layout from "../components/Layout.jsx";

export default function CreateWorkOrder() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [tasks, setTasks] = useState([{ title: "", description: "", requires_photo: false }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/auth/users/employees").then((d) => setEmployees(d.employees));
  }, []);

  const addTask = () => setTasks([...tasks, { title: "", description: "", requires_photo: false }]);
  const removeTask = (i) => setTasks(tasks.filter((_, idx) => idx !== i));
  const updateTask = (i, field, value) => {
    const next = [...tasks];
    next[i] = { ...next[i], [field]: value };
    setTasks(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !address.trim()) {
      setError("Title and property address are required");
      return;
    }
    const validTasks = tasks.filter((t) => t.title.trim());
    setSubmitting(true);
    try {
      const result = await api.post("/work-orders", {
        title,
        property_address: address,
        description,
        assigned_to: assignedTo || null,
        tasks: validTasks,
      });
      navigate(`/manager/work-orders/${result.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <h1>Create Work Order</h1>
        </div>
        <form onSubmit={handleSubmit} className="form-card">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Winterization — 123 Oak St" />
          </div>
          <div className="form-group">
            <label>Property Address *</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City, State ZIP" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Additional details about the job…" />
          </div>
          <div className="form-group">
            <label>Assign To</label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="tasks-section">
            <div className="tasks-section-header">
              <h3>Tasks</h3>
              <button type="button" onClick={addTask} className="btn-secondary btn-sm">+ Add Task</button>
            </div>
            {tasks.map((task, i) => (
              <div key={i} className="task-edit">
                <div className="task-edit-main">
                  <input
                    value={task.title}
                    onChange={(e) => updateTask(i, "title", e.target.value)}
                    placeholder="Task title"
                  />
                  <input
                    value={task.description}
                    onChange={(e) => updateTask(i, "description", e.target.value)}
                    placeholder="Description (optional)"
                  />
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={task.requires_photo}
                      onChange={(e) => updateTask(i, "requires_photo", e.target.checked)}
                    />
                    <span>📸 Requires photo</span>
                  </label>
                </div>
                {tasks.length > 1 && (
                  <button type="button" onClick={() => removeTask(i)} className="btn-remove">×</button>
                )}
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate("/manager")} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create Work Order"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
