import { Router } from "express";
import db from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

// List work orders (employees see only their own)
router.get("/", (req, res) => {
  let sql = `
    SELECT wo.*, u.name AS assigned_name
    FROM work_orders wo
    LEFT JOIN users u ON wo.assigned_to = u.id
  `;
  const params = [];
  if (req.user.role === "employee") {
    sql += " WHERE wo.assigned_to = ?";
    params.push(req.user.id);
  } else if (req.query.status) {
    sql += " WHERE wo.status = ?";
    params.push(req.query.status);
  }
  sql += " ORDER BY wo.created_at DESC";
  res.json({ workOrders: db.prepare(sql).all(...params) });
});

// Get single work order with tasks and photos
router.get("/:id", (req, res) => {
  const wo = db
    .prepare(
      `SELECT wo.*, u.name AS assigned_name, c.name AS created_name
       FROM work_orders wo
       LEFT JOIN users u ON wo.assigned_to = u.id
       LEFT JOIN users c ON wo.created_by = c.id
       WHERE wo.id = ?`
    )
    .get(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found" });

  // Employees can only view their own
  if (req.user.role === "employee" && wo.assigned_to !== req.user.id)
    return res.status(403).json({ error: "Not assigned to you" });

  const tasks = db
    .prepare("SELECT * FROM tasks WHERE work_order_id = ? ORDER BY order_index")
    .all(req.params.id);
  const photos = db
    .prepare("SELECT * FROM photos WHERE work_order_id = ?")
    .all(req.params.id);

  res.json({ workOrder: wo, tasks, photos });
});

// Create work order with tasks
router.post("/", (req, res) => {
  if (req.user.role !== "manager")
    return res.status(403).json({ error: "Only managers can create work orders" });

  const { title, property_address, description, assigned_to, tasks } = req.body;
  if (!title || !property_address)
    return res.status(400).json({ error: "Title and address are required" });

  const result = db
    .prepare(
      `INSERT INTO work_orders (title, property_address, description, assigned_to, created_by)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(title, property_address, description || "", assigned_to || null, req.user.id);

  const woId = result.lastInsertRowid;
  if (tasks && tasks.length > 0) {
    const insertTask = db.prepare(
      `INSERT INTO tasks (work_order_id, title, description, order_index, requires_photo)
       VALUES (?, ?, ?, ?, ?)`
    );
    tasks.forEach((task, i) => {
      insertTask.run(woId, task.title, task.description || "", i, task.requires_photo ? 1 : 0);
    });
  }
  res.json({ id: woId });
});

// Update work order (status / assignment)
router.patch("/:id", (req, res) => {
  if (req.user.role !== "manager")
    return res.status(403).json({ error: "Only managers can edit work orders" });

  const { status, assigned_to } = req.body;
  const updates = [];
  const params = [];
  if (status) { updates.push("status = ?"); params.push(status); }
  if (assigned_to !== undefined) { updates.push("assigned_to = ?"); params.push(assigned_to || null); }
  if (!updates.length) return res.json({ ok: true });

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE work_orders SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// Delete work order
router.delete("/:id", (req, res) => {
  if (req.user.role !== "manager")
    return res.status(403).json({ error: "Only managers can delete work orders" });
  db.prepare("DELETE FROM work_orders WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
