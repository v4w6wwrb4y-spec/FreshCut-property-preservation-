import { Router } from "express";
import multer from "multer";
import { extname } from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import db from "../db.js";
import { authRequired } from "../middleware/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, join(__dirname, "uploads")),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(authRequired);

// Upload photo for a task
router.post("/", upload.single("photo"), (req, res) => {
  const { task_id, work_order_id, latitude, longitude } = req.body;
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  if (!task_id || !work_order_id)
    return res.status(400).json({ error: "task_id and work_order_id required" });

  const result = db
    .prepare(
      `INSERT INTO photos (task_id, work_order_id, file_path, latitude, longitude, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(task_id, work_order_id, req.file.filename, latitude || null, longitude || null, req.user.id);

  // Auto-complete the task if it requires a photo
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task_id);
  if (task && task.requires_photo && !task.completed) {
    db.prepare("UPDATE tasks SET completed = 1, completed_at = ? WHERE id = ?").run(
      new Date().toISOString(), task_id
    );
  }

  // Recalculate work order status
  const tasks = db.prepare("SELECT completed FROM tasks WHERE work_order_id = ?").all(work_order_id);
  const allDone = tasks.length > 0 && tasks.every((t) => t.completed);
  const anyDone = tasks.some((t) => t.completed);
  const status = allDone ? "completed" : anyDone ? "in_progress" : "pending";
  db.prepare("UPDATE work_orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
    status, work_order_id
  );

  res.json({ id: result.lastInsertRowid, filename: req.file.filename });
});

export default router;
