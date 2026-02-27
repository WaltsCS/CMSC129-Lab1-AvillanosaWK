//backend/server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const itemsRoutes = require("./routes/items.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("FERN backend is running ✅"));

app.use("/items", itemsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});