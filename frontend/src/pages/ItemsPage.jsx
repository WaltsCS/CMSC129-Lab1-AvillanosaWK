// frontend/src/pages/ItemsPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createItem,
  getItems,
  hardDeleteItem,
  restoreItem,
  softDeleteItem,
  updateItem,
} from "../api/api";

function fmtTs(ts) {
  if (!ts || !ts._seconds) return "";
  const d = new Date(ts._seconds * 1000);
  return d.toLocaleString();
}

export default function ItemsPage() {
  const [items, setItems] = useState([]);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // add form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // status + errors
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // toast
  const [toast, setToast] = useState(null); // { type: "success" | "error", message: string }
  const toastTimerRef = useRef(null);

  // editing
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const editNameRef = useRef(null);

  // per-action loading labels
  const [busy, setBusy] = useState({
    add: false,
    refresh: false,
    saveEdit: false,
    softDelete: null, // itemId
    restore: null, // itemId
    hardDelete: null, // itemId
  });

  // hard delete modal
  const [confirm, setConfirm] = useState({
    open: false,
    item: null, // { id, name }
  });

  function showToast(type, message, ms = 2200) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }

  async function refresh() {
    setErr("");
    setLoading(true);
    setBusy((b) => ({ ...b, refresh: true }));
    try {
      const res = await getItems(includeDeleted);
      const list = res.data.items || [];

      // Sort newest first
      list.sort(
        (a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0)
      );

      setItems(list);
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to load items.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
      setBusy((b) => ({ ...b, refresh: false }));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted]);

  const activeCount = useMemo(
    () => items.filter((it) => it.deletedAt == null).length,
    [items]
  );

  async function onAdd(e) {
    e.preventDefault();
    setErr("");

    if (!name.trim()) {
      const msg = "Name is required.";
      setErr(msg);                 // inline error (stays)
      showToast("error", msg);     // red toast (auto hides)
      return;
    }

    setBusy((b) => ({ ...b, add: true }));
    try {
      await createItem({ name: name.trim(), description });
      setName("");
      setDescription("");
      showToast("success", "Item added.");
      await refresh();
    } catch (e2) {
      const msg = e2?.response?.data?.error || "Failed to create item.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusy((b) => ({ ...b, add: false }));
    }
  }

  function startEdit(item) {
    setErr("");
    setEditingId(item.id);
    setEditName(item.name || "");
    setEditDesc(item.description || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  }

  // autofocus edit name when edit mode starts
  useEffect(() => {
    if (editingId) {
      // next tick to ensure input is mounted
      setTimeout(() => editNameRef.current?.focus(), 0);
    }
  }, [editingId]);

  async function saveEdit(id) {
    setErr("");

    if (!editName.trim()) {
      const msg = "Name is required.";
      setErr(msg);
      showToast("error", msg);
      return;
    }

    setBusy((b) => ({ ...b, saveEdit: true }));
    try {
      await updateItem(id, { name: editName.trim(), description: editDesc });
      cancelEdit();
      showToast("success", "Item updated.");
      await refresh();
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to update item.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusy((b) => ({ ...b, saveEdit: false }));
    }
  }

  async function doSoftDelete(id) {
    setErr("");
    setBusy((b) => ({ ...b, softDelete: id }));
    try {
      await softDeleteItem(id);
      showToast("success", "Item soft deleted.");
      await refresh();
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to soft delete.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusy((b) => ({ ...b, softDelete: null }));
    }
  }

  async function doRestore(id) {
    setErr("");
    setBusy((b) => ({ ...b, restore: id }));
    try {
      await restoreItem(id);
      showToast("success", "Item restored.");
      await refresh();
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to restore.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusy((b) => ({ ...b, restore: null }));
    }
  }

  function openHardDeleteModal(item) {
    setConfirm({ open: true, item: { id: item.id, name: item.name || "this item" } });
  }

  function closeHardDeleteModal() {
    setConfirm({ open: false, item: null });
  }

  async function confirmHardDelete() {
    if (!confirm.item?.id) return;

    const id = confirm.item.id;
    setErr("");
    setBusy((b) => ({ ...b, hardDelete: id }));

    try {
      await hardDeleteItem(id);
      closeHardDeleteModal();
      showToast("success", "Item permanently deleted.");
      await refresh();
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to hard delete.";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setBusy((b) => ({ ...b, hardDelete: null }));
    }
  }

  function onEditKeyDown(e, id) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Inventory App</h1>
            <p style={styles.subtitle}>
              Active: <b>{activeCount}</b> • Total shown: <b>{items.length}</b>
            </p>
          </div>

          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              disabled={busy.refresh}
            />
            <span style={{ marginLeft: 8 }}>Show deleted</span>
          </label>
        </header>

        {/* toast */}
        {toast && (
          <div
            style={{
              ...styles.toast,
              ...(toast.type === "success" ? styles.toastSuccess : styles.toastError),
            }}
            role="status"
            aria-live="polite"
          >
            {toast.message}
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
              disabled={busy.add}
            />
            <input
              style={styles.input}
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy.add}
            />
            <button style={styles.primaryBtn} type="submit" disabled={busy.add}>
              {busy.add ? "Adding..." : "Add"}
            </button>
          </form>

          {err && <div style={styles.error}>{err}</div>}
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeaderRow}>
            <h2 style={styles.cardTitle}>Items</h2>
            <button
              style={styles.secondaryBtn}
              onClick={refresh}
              disabled={busy.refresh}
            >
              {busy.refresh ? "Refreshing..." : "Refresh"}
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

                const softBusy = busy.softDelete === it.id;
                const restoreBusy = busy.restore === it.id;
                const hardBusy = busy.hardDelete === it.id;

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
                            ref={editNameRef}
                            style={styles.inputSmall}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => onEditKeyDown(e, it.id)}
                            disabled={busy.saveEdit}
                          />
                          <input
                            style={styles.inputSmall}
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            onKeyDown={(e) => onEditKeyDown(e, it.id)}
                            disabled={busy.saveEdit}
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
                            disabled={busy.saveEdit}
                          >
                            {busy.saveEdit ? "Saving..." : "Save"}
                          </button>
                          <button
                            style={styles.ghostBtnSmall}
                            onClick={cancelEdit}
                            disabled={busy.saveEdit}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            style={styles.ghostBtnSmall}
                            onClick={() => startEdit(it)}
                            disabled={isDeleted || softBusy || restoreBusy || hardBusy}
                            title={isDeleted ? "Restore first to edit" : "Edit"}
                          >
                            Edit
                          </button>

                          {isDeleted ? (
                            <button
                              style={styles.secondaryBtnSmall}
                              onClick={() => doRestore(it.id)}
                              disabled={restoreBusy || hardBusy}
                            >
                              {restoreBusy ? "Restoring..." : "Restore"}
                            </button>
                          ) : (
                            <button
                              style={styles.secondaryBtnSmall}
                              onClick={() => doSoftDelete(it.id)}
                              disabled={softBusy || hardBusy}
                            >
                              {softBusy ? "Deleting..." : "Soft delete"}
                            </button>
                          )}

                          <button
                            style={styles.dangerBtnSmall}
                            onClick={() => openHardDeleteModal(it)}
                            disabled={hardBusy}
                          >
                            {hardBusy ? "Deleting..." : "Hard delete"}
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
      </div>

      {/* hard delete modal */}
      {confirm.open && (
        <div style={styles.modalOverlay} onMouseDown={closeHardDeleteModal}>
          <div
            style={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm Hard Delete"
          >
            <div style={styles.modalTitle}>Confirm Hard Delete</div>
            <div style={styles.modalBody}>
              Delete <b>{confirm.item?.name}</b> permanently? This cannot be undone.
            </div>

            <div style={styles.modalActions}>
              <button style={styles.ghostBtnSmall} onClick={closeHardDeleteModal}>
                Cancel
              </button>
              <button
                style={styles.dangerBtnSmall}
                onClick={confirmHardDelete}
                disabled={busy.hardDelete === confirm.item?.id}
              >
                {busy.hardDelete === confirm.item?.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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

  toast: {
    padding: "10px 12px",
    borderRadius: 12,
    marginBottom: 12,
    border: "1px solid transparent",
  },
  toastSuccess: {
    background: "rgba(52, 211, 153, 0.12)",
    borderColor: "rgba(52, 211, 153, 0.35)",
    color: "#b6ffe8",
  },
  toastError: {
    background: "rgba(255, 90, 90, 0.14)",
    borderColor: "rgba(255,90,90,0.35)",
    color: "#ffb3b3",
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

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 999,
  },
  modal: {
    width: "min(520px, 100%)",
    background: "rgba(20, 24, 36, 0.96)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 16,
    boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: 800, marginBottom: 8 },
  modalBody: { color: "#d7def4", lineHeight: 1.5, marginBottom: 14 },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
};