const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("UniBite server is running!");
});

// TEST API: παίρνει όλα τα meals
app.get("/api/meals", (req, res) => {
  const sql = "SELECT * FROM meals";

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
      return;
    }

    res.json(results);
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});