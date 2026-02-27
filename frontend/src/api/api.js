// frontend/src/api/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
});

export const getItems = (includeDeleted = false) =>
  API.get(`/items${includeDeleted ? "?includeDeleted=1" : ""}`);

export const createItem = (data) => API.post("/items", data);

export const updateItem = (id, data) => API.put(`/items/${id}`, data);

export const softDeleteItem = (id) => API.patch(`/items/${id}/soft-delete`);

export const restoreItem = (id) => API.patch(`/items/${id}/restore`);

export const hardDeleteItem = (id) => API.delete(`/items/${id}`);