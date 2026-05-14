const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("UniBite server is running!");
});

// ================== AUTH ==================

// REGISTER
app.post("/api/register", async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password || !role) {
    return res.status(400).json({ error: "Fill all fields" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = `
    INSERT INTO users (username, email, password, role, points)
    VALUES (?, ?, ?, ?, 5)
  `;

  db.query(sql, [username, email, hashedPassword, role], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "User exists or DB error" });
    }

    res.json({ message: "User created" });
  });
});

// LOGIN
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "DB error" });

    if (results.length === 0) {
      return res.status(401).json({ error: "Wrong email/password" });
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Wrong email/password" });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  });
});

// ================== MEALS ==================

// GET
app.get("/api/meals", (req, res) => {
  db.query("SELECT * FROM meals", (err, results) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(results);
  });
});

// POST
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
      if (err) return res.status(500).json({ error: "DB error" });

      res.json({ message: "Meal added" });
    }
  );
});

// DELETE
app.delete("/api/meals/:id", (req, res) => {
  db.query("DELETE FROM meals WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json({ message: "Deleted" });
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});