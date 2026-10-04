import { Router } from "express";
import db from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

function recalcStatus(workOrderId) {
  const tasks = db
    .prepare("SELECT completed FROM tasks WHERE work_order_id = ?")
    .all(workOrderId);
  const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
  const anyDone = tasks.some((t) => t.completed);
  const status = allDone ? "completed" : anyDone ? "in_progress" : "pending";
  db.prepare("UPDATE work_orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
    status, workOrderId
  );
}

// Toggle task completion
router.patch("/:id", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });

  // If marking complete and photo is required, verify a photo exists
  if (req.body.completed && task.requires_photo && !task.completed) {
    const hasPhoto = db
      .prepare("SELECT COUNT(*) as count FROM photos WHERE task_id = ?")
      .get(req.params.id);
    if (hasPhoto.count === 0)
      return res.status(400).json({ error: "This task requires a photo before it can be completed" });
  }

  const completed = req.body.completed ? 1 : 0;
  db.prepare("UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ?").run(
    completed, req.body.completed ? new Date().toISOString() : null, req.params.id
  );
  recalcStatus(task.work_order_id);
  res.json({ ok: true });
});

// Add task to a work order
router.post("/", (req, res) => {
  if (req.user.role !== "manager")
    return res.status(403).json({ error: "Only managers can add tasks" });

  const { work_order_id, title, description, requires_photo } = req.body;
  if (!title) return res.status(400).json({ error: "Task title required" });

  const count = db
    .prepare("SELECT COUNT(*) as count FROM tasks WHERE work_order_id = ?")
    .get(work_order_id);
  db.prepare(
    `INSERT INTO tasks (work_order_id, title, description, order_index, requires_photo)
     VALUES (?, ?, ?, ?, ?)`
  ).run(work_order_id, title, description || "", count.count, requires_photo ? 1 : 0);
  res.json({ ok: true });
});

// Delete task
router.delete("/:id", (req, res) => {
  if (req.user.role !== "manager")
    return res.status(403).json({ error: "Only managers can delete tasks" });
  const task = db.prepare("SELECT work_order_id FROM tasks WHERE id = ?").get(req.params.id);
  db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
  if (task) recalcStatus(task.work_order_id);
  res.json({ ok: true });
});

export default router;
