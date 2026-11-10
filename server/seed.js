import bcrypt from "bcryptjs";
import db from "./db.js";

const existing = db.prepare("SELECT COUNT(*) as count FROM users").get();
if (existing.count > 0) {
  console.log("Database already has data — skipping seed.");
  process.exit(0);
}

const hash = bcrypt.hashSync("password123", 10);
const insertUser = db.prepare(
  "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
);

const managerId = insertUser.run("Sarah Mitchell", "manager@freshcut.com", hash, "manager").lastInsertRowid;
const emp1Id = insertUser.run("Mike Johnson", "mike@freshcut.com", hash, "employee").lastInsertRowid;
const emp2Id = insertUser.run("Lisa Garcia", "lisa@freshcut.com", hash, "employee").lastInsertRowid;

const insertOrder = db.prepare(
  `INSERT INTO work_orders (title, property_address, description, assigned_to, created_by, status)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const insertTask = db.prepare(
  `INSERT INTO tasks (work_order_id, title, description, order_index, requires_photo, completed)
   VALUES (?, ?, ?, ?, ?, ?)`
);

// Work order 1 — in progress
const wo1 = insertOrder.run(
  "Winterization — 123 Oak St",
  "123 Oak Street, Springfield, IL 62701",
  "Full winterization of vacant property. Drain all pipes, add antifreeze, board windows.",
  emp1Id, managerId, "in_progress"
).lastInsertRowid;
insertTask.run(wo1, "Turn off main water supply", "Locate and shut off the main water valve.", 0, 0, 1);
insertTask.run(wo1, "Drain all pipes", "Open all faucets and drain the plumbing system completely.", 1, 1, 1);
insertTask.run(wo1, "Add antifreeze to drains", "Pour RV antifreeze into all drains and toilets.", 2, 1, 0);
insertTask.run(wo1, "Board up windows", "Board up all ground-floor windows with plywood.", 3, 1, 0);

// Work order 2 — pending
const wo2 = insertOrder.run(
  "Trashout — 456 Elm Ave",
  "456 Elm Avenue, Decatur, IL 62523",
  "Remove all debris and trash from the property. Clean interior thoroughly.",
  emp2Id, managerId, "pending"
).lastInsertRowid;
insertTask.run(wo2, "Remove all debris from interior", "Clear all rooms of trash and personal items left behind.", 0, 1, 0);
insertTask.run(wo2, "Clean kitchen and bathrooms", "Deep clean all kitchen surfaces and bathroom fixtures.", 1, 1, 0);
insertTask.run(wo2, "Photograph each room", "Take photos of each room after cleaning for the report.", 2, 1, 0);

// Work order 3 — unassigned
const wo3 = insertOrder.run(
  "Lawn Maintenance — 789 Pine Rd",
  "789 Pine Road, Chatham, IL 62629",
  "Mow lawn, trim hedges, remove weeds from flower beds.",
  null, managerId, "pending"
).lastInsertRowid;
insertTask.run(wo3, "Mow front and back lawn", "Mow entire property to 3-inch height.", 0, 1, 0);
insertTask.run(wo3, "Trim hedges", "Trim all hedges along property line.", 1, 0, 0);
insertTask.run(wo3, "Remove weeds", "Pull weeds from flower beds and walkways.", 2, 0, 0);

console.log("✓ Seed complete — 3 users, 3 work orders, 10 tasks");
console.log("  Manager:  manager@freshcut.com / password123");
console.log("  Employee: mike@freshcut.com / password123");
console.log("  Employee: lisa@freshcut.com / password123");
