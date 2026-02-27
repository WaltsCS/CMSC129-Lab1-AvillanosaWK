# CMSC129 Lab 1 – FERN CRUD Application

This project demonstrates full-stack CRUD operations using the FERN stack with soft delete and hard delete implementation.

A simple CRUD application built using the **FERN Tech Stack**:

- **F**irebase (Firestore via Firebase Admin SDK)
- **E**xpress.js
- **R**eact
- **N**ode.js

This application supports:

- Create item
- Read items
- Update item
- Soft delete
- Restore deleted items
- Hard delete (permanent removal)

---

## 📌 Features

### ✅ Core CRUD
- Add new items
- View all active items
- Edit item name and description
- Hard delete items permanently

### ✅ Soft Delete
- Items are not removed immediately
- `deletedAt` timestamp is set
- Can toggle **"Show Deleted"**
- Deleted items can be restored

### ✅ Hard Delete
- Permanently removes the item from Firestore
- Confirmation dialog required

---

## 🏗️ Project Structure

```text
fern-crud/
│
├── backend/
│ ├── firebase.js
│ ├── server.js
│ └── routes/
│ └── items.routes.js
│
├── frontend/
│ ├── src/
│ │ ├── api/
│ │ │ └── api.js
│ │ ├── pages/
│ │ │ └── ItemsPage.jsx
│ │ └── App.js
│
└── README.md
```

---

## 📦 Prerequisites

- Node.js (v18+ recommended)
- npm
- Firebase project with Firestore enabled

---

## 🚀 Quick Start (How to run)

Clone the repository:

```bash
git clone <your-repo-url>
cd CMSC129-Lab1-AvillanosaWK
```

Start backend:

```bash
cd backend
npm install
npm run dev
```

Start frontend (new terminal):

```bash
cd frontend
npm install
npm start
```

---

## ⚙️ Backend Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Create .env file inside backend

```ini
PORT=5000
FIREBASE_SERVICE_ACCOUNT_PATH=<InsertPathOfYourGeneratedPrivateKeyHere>
FIREBASE_PROJECT_ID=<title-of-your-project-listed-in-your-firebase-console>
```
### 3. Add Firebase Service Account Key

- Download service account JSON from Firebase Console
- Place it outside the repository
- Update firebase.js to point to its path

⚠️ The service account key is NOT committed to GitHub.

### 4. Run Backend

```bash
npm run dev
```

Backend runs at:

```bash
http://localhost:5000
```

---

##  🎨 Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Start React Dev Server

```bash
npm start
```

Frontend runs at:

```bash
http://localhost:3000
```

## 🔗 API Endpoints

Base URL:

```bash
http://localhost:5000
```

### Get all active items

```bash
GET /items
```

### Get all items including deleted

```bash
GET /items?includeDeleted=1
```

### Create item

```bash
POST /items
Body:

{
  "name": "Item name",
  "description": "Optional description"
}
```

### Update item

```bash
PUT /items/:id
```

### Soft delete item

```bash
PATCH /items/:id/soft-delete
```

### Restore item

```bash
PATCH /items/:id/restore
```

### Hard delete item

```bash
DELETE /items/:id
```

---

## 🔐 Security Notes

- .env file is ignored via .gitignore
- Firebase service account key is not committed
- node_modules are excluded
- CORS enabled for local development

---

## 📷 UI Behavior

- Clean dark-themed interface
- Real-time refresh after CRUD operations
- Deleted items appear faded with DELETED badge
- Confirmation required for hard delete

---

## 🚀 Tech Stack Summary

- React (Frontend UI)
- Axios (API communication)
- Express.js (Backend server)
- Firebase Admin SDK (Firestore database)
- Node.js runtime

---

## 👨‍💻 Author

Avillanosa, WK
CMSC129 – Laboratory 1

---