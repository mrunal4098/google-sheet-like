// File: server.js (at project root)
const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors()); // allow cross-origin requests from React dev server
app.use(express.json());

// We'll just store data in a JSON file for simplicity:
const FILE_PATH = "./spreadsheetData.json";

// Load existing data if file exists, else use a default object
function loadData() {
  if (fs.existsSync(FILE_PATH)) {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(raw);
  }
  // Default
  return {
    sheetId: "default",
    cells: [],
  };
}

// Save data to file
function saveData(data) {
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
}

app.get("/load/:sheetId", (req, res) => {
  const { sheetId } = req.params;
  const data = loadData();
  if (data.sheetId === sheetId) {
    return res.json(data);
  }
  return res.json({ sheetId, cells: [] }); // or handle a 404
});

app.post("/save", (req, res) => {
  const { sheetId, cells } = req.body;
  if (!sheetId || !cells) {
    return res.status(400).json({ error: "Missing sheetId or cells" });
  }
  const data = { sheetId, cells };
  saveData(data);
  return res.json({ success: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
