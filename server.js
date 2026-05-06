const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("UniBite server is running!");
});

// GET: παίρνει όλα τα meals
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

// POST: δημιουργεί νέο meal
app.post("/api/meals", (req, res) => {
  const { user_id, title, description, portions, location, pickup_time } = req.body;

  const sql = `
    INSERT INTO meals (user_id, title, description, portions, location, pickup_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [user_id, title, description, portions, location, pickup_time],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
        return;
      }

      res.status(201).json({
        message: "Meal created successfully",
        mealId: result.insertId,
      });
    }
  );
});

// DELETE: διαγράφει meal
app.delete("/api/meals/:id", (req, res) => {
  const mealId = req.params.id;

  const sql = "DELETE FROM meals WHERE id = ?";

  db.query(sql, [mealId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: "Database error" });
      return;
    }

    res.json({ message: "Meal deleted successfully" });
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});