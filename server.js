const express = require("express");
const cors = require("cors");
const db = require("./db");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());

// =====================
// TEST
// =====================
app.get("/", (req, res) => {
  res.send("UniBite server is running!");
});

// =====================
// REGISTER
// =====================
app.post("/api/register", async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (username, email, password, role, points)
      VALUES (?, ?, ?, ?, 0)
    `;

    db.query(sql, [username, email, hashedPassword, role], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Register failed" });
      }

      res.json({ message: "User created" });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error" });
  }
});

// =====================
// LOGIN
// =====================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = results[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: "Wrong password" });
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

// =====================
// GET MEALS
// =====================
app.get("/api/meals", (req, res) => {
  db.query("SELECT * FROM meals", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
});

// =====================
// ADD MEAL
// =====================
app.post("/api/meals", (req, res) => {
  const {
    user_id,
    title,
    description,
    portions,
    location,
    pickup_time,
    price,
  } = req.body;

  const sql = `
    INSERT INTO meals (user_id, title, description, portions, location, pickup_time, price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [user_id, title, description, portions, location, pickup_time, price],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({ message: "Meal created" });
    }
  );
});

// =====================
// DELETE MEAL
// =====================
app.delete("/api/meals/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM meals WHERE id = ?", [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ message: "Meal deleted" });
  });
});

// =====================
// CREATE REQUEST
// =====================
app.post("/api/requests", (req, res) => {
  const { meal_id, consumer_id } = req.body;

  const sql = `
    INSERT INTO requests (meal_id, consumer_id, status)
    VALUES (?, ?, 'pending')
  `;

  db.query(sql, [meal_id, consumer_id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ message: "Request created" });
  });
});

// =====================
// GET REQUESTS (COOK)
// =====================
app.get("/api/requests/:cook_id", (req, res) => {
  const cookId = req.params.cook_id;

  const sql = `
    SELECT requests.id, users.username, meals.title
    FROM requests
    JOIN meals ON requests.meal_id = meals.id
    JOIN users ON requests.consumer_id = users.id
    WHERE meals.user_id = ?
  `;

  db.query(sql, [cookId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
});

// =====================
// START SERVER
// =====================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});