//frontend/src/pages/ItemsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  createItem,
  getItems,
  hardDeleteItem,
  restoreItem,
  softDeleteItem,
  updateItem,
} from "../api/api";

function fmtTs(ts) {
  //Firestore timestamps come as { _seconds, _nanoseconds } in our JSON
  if (!ts || !ts._seconds) return "";
  const d = new Date(ts._seconds * 1000);
  return d.toLocaleString();
}

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  //Toast
  const [toast, setToast] = useState({ type: "", text: "" });

  //Per-item action loading
  const [busyId, setBusyId] = useState(null);

  //Hard delete modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState(null);

  function showToast(type, text) {
    setToast({ type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast({ type: "", text: "" }), 2000);
  }

  function openHardDeleteModal(item) {
    setConfirmItem(item);
    setConfirmOpen(true);
  }

  function closeHardDeleteModal() {
    setConfirmOpen(false);
    setConfirmItem(null);
  }

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const res = await getItems(includeDeleted);
      const list = res.data.items || [];

      //Sort client-side (since GET active-only may not be ordered)
      list.sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));

      setItems(list);
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to load items.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted]);

  const activeCount = useMemo(
    () => items.filter((it) => it.deletedAt == null).length,
    [items]
  );

  async function onAdd(e) {
    e.preventDefault();
    setErr("");

    if (!name.trim()) {
      setErr("Name is required.");
      showToast("error", "Name is required.");
      return;
    }

    setBusyId("add");
    try {
      await createItem({ name, description });
      setName("");
      setDescription("");
      await refresh();
      showToast("success", "Item added.");
    } catch (e2) {
      const msg = e2?.response?.data?.error || "Failed to create item.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditName(item.name || "");
    setEditDesc(item.description || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  }

  async function saveEdit(id) {
    setErr("");
    setBusyId(id);
    try {
      await updateItem(id, { name: editName, description: editDesc });
      cancelEdit();
      await refresh();
      showToast("success", "Item updated.");
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to update item.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusyId(null);
    }
  }

  async function doSoftDelete(id) {
    setErr("");
    setBusyId(id);
    try {
      await softDeleteItem(id);
      await refresh();
      showToast("success", "Item soft deleted.");
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to soft delete.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusyId(null);
    }
  }

  async function doRestore(id) {
    setErr("");
    setBusyId(id);
    try {
      await restoreItem(id);
      await refresh();
      showToast("success", "Item restored.");
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to restore.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusyId(null);
    }
  }

  async function confirmHardDelete() {
    if (!confirmItem?.id) return;

    setErr("");
    setBusyId(confirmItem.id);
    try {
      await hardDeleteItem(confirmItem.id);
      closeHardDeleteModal();
      await refresh();
      showToast("success", "Item permanently deleted.");
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to hard delete.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Items CRUD</h1>
            <p style={styles.subtitle}>
              Active: <b>{activeCount}</b> • Total shown: <b>{items.length}</b>
            </p>
          </div>

          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
            />
            <span style={{ marginLeft: 8 }}>Show deleted</span>
          </label>
        </header>

        {toast.text && (
          <div
            style={{
              ...styles.toast,
              ...(toast.type === "success" ? styles.toastSuccess : styles.toastError),
            }}
          >
            {toast.text}
          </div>
        )}

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Add Item</h2>

          <form onSubmit={onAdd} style={styles.form}>
            <input
              style={styles.input}
              placeholder="Item name (required)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busyId === "add"}
            />
            <input
              style={styles.input}
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busyId === "add"}
            />
            <button style={styles.primaryBtn} type="submit" disabled={busyId === "add"}>
              {busyId === "add" ? "Adding..." : "Add"}
            </button>
          </form>

          {err && <div style={styles.error}>{err}</div>}
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h2 style={styles.cardTitle}>Items</h2>
            <button style={styles.secondaryBtn} onClick={refresh} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div style={styles.muted}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={styles.muted}>No items yet.</div>
          ) : (
            <div style={styles.list}>
              {items.map((it) => {
                const isDeleted = it.deletedAt != null;
                const isEditing = editingId === it.id;
                const isBusy = busyId === it.id;

                return (
                  <div
                    key={it.id}
                    style={{
                      ...styles.row,
                      opacity: isDeleted ? 0.7 : 1,
                      borderColor: isDeleted ? "#444" : "#333",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isEditing ? (
                        <>
                          <input
                            style={styles.inputSmall}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            disabled={isBusy}
                          />
                          <input
                            style={styles.inputSmall}
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            disabled={isBusy}
                          />
                        </>
                      ) : (
                        <>
                          <div style={styles.itemTopRow}>
                            <div style={styles.itemName}>
                              {it.name || "(no name)"}
                              {isDeleted && <span style={styles.badge}>DELETED</span>}
                            </div>
                            <div style={styles.meta}>Created: {fmtTs(it.createdAt)}</div>
                          </div>
                          <div style={styles.itemDesc}>{it.description || "—"}</div>
                          <div style={styles.meta}>Updated: {fmtTs(it.updatedAt)}</div>
                        </>
                      )}
                    </div>

                    <div style={styles.actions}>
                      {isEditing ? (
                        <>
                          <button
                            style={styles.primaryBtnSmall}
                            onClick={() => saveEdit(it.id)}
                            disabled={isBusy}
                          >
                            {isBusy ? "Saving..." : "Save"}
                          </button>
                          <button
                            style={styles.ghostBtnSmall}
                            onClick={cancelEdit}
                            disabled={isBusy}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            style={styles.ghostBtnSmall}
                            onClick={() => startEdit(it)}
                            disabled={isDeleted || isBusy}
                            title={isDeleted ? "Restore first to edit" : "Edit"}
                          >
                            Edit
                          </button>

                          {isDeleted ? (
                            <button
                              style={styles.secondaryBtnSmall}
                              onClick={() => doRestore(it.id)}
                              disabled={isBusy}
                            >
                              {isBusy ? "Restoring..." : "Restore"}
                            </button>
                          ) : (
                            <button
                              style={styles.secondaryBtnSmall}
                              onClick={() => doSoftDelete(it.id)}
                              disabled={isBusy}
                            >
                              {isBusy ? "Deleting..." : "Soft delete"}
                            </button>
                          )}

                          <button
                            style={styles.dangerBtnSmall}
                            onClick={() => openHardDeleteModal(it)}
                            disabled={isBusy}
                          >
                            {isBusy ? "Deleting..." : "Hard delete"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer style={styles.footer}>
          <span style={styles.muted}>
            Backend: <code>http://localhost:5000</code>
          </span>
        </footer>

        {confirmOpen && (
          <div style={styles.modalOverlay} onClick={closeHardDeleteModal}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>Confirm Hard Delete</h3>
              <p style={{ color: "#aab3cf", marginTop: 6 }}>
                Delete <b>{confirmItem?.name || "this item"}</b> permanently? This cannot
                be undone.
              </p>

              <div style={styles.modalActions}>
                <button style={styles.ghostBtnSmall} onClick={closeHardDeleteModal}>
                  Cancel
                </button>
                <button
                  style={styles.dangerBtnSmall}
                  onClick={confirmHardDelete}
                  disabled={busyId === confirmItem?.id}
                >
                  {busyId === confirmItem?.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #0b1020, #090a10)",
    color: "#e9eefc",
    padding: 24,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  container: { maxWidth: 980, margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  title: { margin: 0, fontSize: 32, letterSpacing: 0.2 },
  subtitle: { margin: "6px 0 0", color: "#aab3cf" },
  toggle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 12,
  },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
  cardTitle: { margin: 0, fontSize: 18 },
  cardHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  form: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 },
  input: {
    flex: "1 1 240px",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    color: "#e9eefc",
    outline: "none",
  },
  inputSmall: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    color: "#e9eefc",
    outline: "none",
    marginBottom: 8,
  },
  list: { display: "flex", flexDirection: "column", gap: 10, marginTop: 12 },
  row: {
    display: "flex",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    border: "1px solid #333",
    background: "rgba(0,0,0,0.25)",
  },
  itemTopRow: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  itemName: { fontSize: 16, fontWeight: 700, minWidth: 0 },
  itemDesc: { marginTop: 6, color: "#d7def4", wordBreak: "break-word" },
  meta: { marginTop: 6, color: "#aab3cf", fontSize: 12, whiteSpace: "nowrap" },
  badge: {
    marginLeft: 10,
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    background: "rgba(255, 90, 90, 0.18)",
    border: "1px solid rgba(255, 90, 90, 0.35)",
    color: "#ffb3b3",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    alignItems: "stretch",
    minWidth: 120,
  },
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "linear-gradient(180deg, #4c7dff, #2f55ff)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  primaryBtnSmall: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "linear-gradient(180deg, #4c7dff, #2f55ff)",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryBtnSmall: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    cursor: "pointer",
    fontWeight: 600,
  },
  ghostBtnSmall: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "transparent",
    color: "#e9eefc",
    cursor: "pointer",
    fontWeight: 600,
  },
  dangerBtnSmall: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,90,90,0.35)",
    background: "rgba(255, 90, 90, 0.14)",
    color: "#ffb3b3",
    cursor: "pointer",
    fontWeight: 700,
  },
  error: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255, 90, 90, 0.14)",
    border: "1px solid rgba(255,90,90,0.35)",
    color: "#ffb3b3",
  },
  muted: { color: "#aab3cf" },
  footer: { marginTop: 10, textAlign: "center" },

  toast: {
    marginBottom: 12,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
  },
  toastSuccess: {
    border: "1px solid rgba(120,255,170,0.25)",
    background: "rgba(120,255,170,0.10)",
    color: "#bfffd9",
  },
  toastError: {
    border: "1px solid rgba(255,90,90,0.35)",
    background: "rgba(255,90,90,0.12)",
    color: "#ffb3b3",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(15,18,28,0.95)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    padding: 16,
  },
  modalActions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    marginTop: 14,
  },
};