import { Router } from "express";
import db from "../db.js";
import { authRequired } from "../middleware/auth.js";

const router = Router();
router.use(authRequired);

const COLUMN_ALIASES = {
  title: ["title", "work order", "job title", "project", "job", "name"],
  property_address: ["address", "property address", "property", "location", "site"],
  description: ["description", "notes", "details", "comments", "scope"],
  status: ["status", "state"],
  assigned_name: ["assigned to", "employee", "technician", "assigned", "worker", "crew"],
};

const STATUS_MAP = {
  pending: "pending", new: "pending", "not started": "pending", unstarted: "pending",
  "in progress": "in_progress", in_progress: "in_progress", started: "in_progress", active: "in_progress",
  completed: "completed", complete: "completed", done: "completed", finished: "completed",
};

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function mapColumns(headers) {
  const mapping = {};
  headers.forEach((header, index) => {
    const norm = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(norm) && !(field in mapping)) {
        mapping[field] = index;
      }
    }
  });
  return mapping;
}

// POST /api/sheets/sync — import work orders from a Google Sheet (CSV export)
router.post("/sync", async (req, res) => {
  if (req.user.role !== "manager")
    return res.status(403).json({ error: "Only managers can import data" });

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId || spreadsheetId === "placeholder") {
    return res.status(400).json({ error: "Google Sheets not configured — add your spreadsheet ID in the Secrets settings." });
  }

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    const resp = await fetch(csvUrl, { redirect: "follow" });
    if (!resp.ok) {
      return res.status(400).json({
        error: `Could not access spreadsheet (HTTP ${resp.status}). Make sure the sheet is shared as "Anyone with link → Viewer".`,
      });
    }
    const csv = await resp.text();
    const lines = csv.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: "Spreadsheet is empty or has no data rows." });
    }

    const headers = parseCSVLine(lines[0]);
    const colMap = mapColumns(headers);

    if (colMap.title === undefined) {
      return res.status(400).json({
        error: `Could not find a title column. Expected one of: ${COLUMN_ALIASES.title.join(", ")}. Found: ${headers.join(", ")}`,
      });
    }
    if (colMap.property_address === undefined) {
      return res.status(400).json({
        error: `Could not find an address column. Expected one of: ${COLUMN_ALIASES.property_address.join(", ")}. Found: ${headers.join(", ")}`,
      });
    }

    const existingTitles = db.prepare("SELECT title FROM work_orders").all().map((r) => r.title);
    const employees = db.prepare("SELECT id, name FROM users WHERE role = 'employee'").all();
    const insertOrder = db.prepare(
      `INSERT INTO work_orders (title, property_address, description, assigned_to, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      const title = row[colMap.title];
      if (!title || existingTitles.includes(title)) { skipped++; continue; }

      const address = colMap.property_address !== undefined ? row[colMap.property_address] || "" : "";
      const description = colMap.description !== undefined ? row[colMap.description] || "" : "";
      const statusRaw = colMap.status !== undefined ? (row[colMap.status] || "").toLowerCase().trim() : "pending";
      const status = STATUS_MAP[statusRaw] || "pending";
      const assignedName = colMap.assigned_name !== undefined ? (row[colMap.assigned_name] || "").trim() : "";
      const employee = employees.find((e) => e.name.toLowerCase() === assignedName.toLowerCase());

      insertOrder.run(title, address, description, employee?.id || null, req.user.id, status);
      existingTitles.push(title);
      imported++;
    }

    res.json({ imported, skipped, total: lines.length - 1 });
  } catch (err) {
    console.error("Sheets sync error:", err);
    res.status(500).json({ error: "Failed to sync: " + err.message });
  }
});

// GET /api/sheets/status — check if integration is configured
router.get("/status", (req, res) => {
  const configured = !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID && process.env.GOOGLE_SHEETS_SPREADSHEET_ID !== "placeholder";
  res.json({ configured });
});

export default router;
