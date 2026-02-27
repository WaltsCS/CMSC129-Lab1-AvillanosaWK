//backend/routes/items.routes.js
const express = require("express");
const { db } = require("../firebase");

const router = express.Router();
const COLLECTION = "items";

/**
 * Item schema (simple):
 * {
 *   name: string,
 *   description: string,
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp,
 *   deletedAt: Timestamp | null
 * }
 */

//GET /items?includeDeleted=1
router.get("/", async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === "1";

    let query = db.collection(COLLECTION);

    if (includeDeleted) {
      query = query.orderBy("createdAt", "desc");
    } else {
      query = query.where("deletedAt", "==", null);
      // no orderBy here -> no composite index needed
    }

    const snap = await query.get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({ items });
  } catch (err) {
    console.error("GET /items error:", err);
    return res.status(500).json({ error: "Failed to fetch items." });
  }
});

//POST /items
router.post("/", async (req, res) => {
  try {
    const { name, description = "" } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required (non-empty string)." });
    }

    const now = new Date();

    const docRef = await db.collection(COLLECTION).add({
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    const created = await docRef.get();
    return res.status(201).json({ item: { id: docRef.id, ...created.data() } });
  } catch (err) {
    console.error("POST /items error:", err);
    return res.status(500).json({ error: "Failed to create item." });
  }
});

//PUT /items/:id (edit)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const docRef = db.collection(COLLECTION).doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ error: "Item not found." });
    }

    const patch = { updatedAt: new Date() };

    if (typeof name === "string") patch.name = name.trim();
    if (typeof description === "string") patch.description = description.trim();

    await docRef.update(patch);

    const updated = await docRef.get();
    return res.json({ item: { id, ...updated.data() } });
  } catch (err) {
    console.error("PUT /items/:id error:", err);
    return res.status(500).json({ error: "Failed to update item." });
  }
});

//PATCH /items/:id/soft-delete
router.patch("/:id/soft-delete", async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(COLLECTION).doc(id);

    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Item not found." });
    }

    await docRef.update({
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    const updated = await docRef.get();
    return res.json({ item: { id, ...updated.data() } });
  } catch (err) {
    console.error("PATCH /items/:id/soft-delete error:", err);
    return res.status(500).json({ error: "Failed to soft delete item." });
  }
});

//PATCH /items/:id/restore (optional but useful)
router.patch("/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(COLLECTION).doc(id);

    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Item not found." });
    }

    await docRef.update({
      deletedAt: null,
      updatedAt: new Date(),
    });

    const updated = await docRef.get();
    return res.json({ item: { id, ...updated.data() } });
  } catch (err) {
    console.error("PATCH /items/:id/restore error:", err);
    return res.status(500).json({ error: "Failed to restore item." });
  }
});

//DELETE /items/:id (hard delete)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection(COLLECTION).doc(id);

    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Item not found." });
    }

    await docRef.delete();
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /items/:id error:", err);
    return res.status(500).json({ error: "Failed to hard delete item." });
  }
});

//GET /items/backup (simple JSON export)
router.get("/backup/export", async (req, res) => {
  try {
    const snap = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="items-backup.json"`);
    return res.status(200).send(JSON.stringify({ exportedAt: new Date(), items }, null, 2));
  } catch (err) {
    console.error("GET /items/backup/export error:", err);
    return res.status(500).json({ error: "Failed to export backup." });
  }
});

module.exports = router;