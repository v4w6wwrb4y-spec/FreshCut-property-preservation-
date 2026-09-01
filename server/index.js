import express from "express";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import authRoutes from "./routes/auth.js";
import workOrderRoutes from "./routes/workOrders.js";
import taskRoutes from "./routes/tasks.js";
import photoRoutes from "./routes/photos.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(__dirname, "uploads"), { recursive: true });

const app = express();
const PORT = process.env.PORT || 8001;

app.use(express.json({ limit: "15mb" }));
app.use("/api/uploads", express.static(join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/work-orders", workOrderRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/photos", photoRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FreshCut API running on port ${PORT}`);
});
