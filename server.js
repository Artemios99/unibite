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
  res.send("Server OK");
});

// =====================
// REGISTER
// =====================
app.post("/api/register", async (req, res) => {
  const { username, email, password, role } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = `
    INSERT INTO users (username, email, password, role, points)
    VALUES (?, ?, ?, ?, 0)
  `;

  db.query(sql, [username, email, hashedPassword, role], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "ok" });
  });
});

// =====================
// LOGIN
// =====================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0)
      return res.status(401).json({ error: "User not found" });

    const user = result[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ error: "Wrong password" });

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
  db.query("SELECT * FROM meals WHERE portions > 0", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// =====================
// ADD MEAL
// =====================
app.post("/api/meals", (req, res) => {
  const { user_id, title, description, portions, location, pickup_time, price } = req.body;

  const sql = `
    INSERT INTO meals (user_id, title, description, portions, location, pickup_time, price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [user_id, title, description, portions, location, pickup_time, price], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "ok" });
  });
});

// =====================
// DELETE MEAL
// =====================
app.delete("/api/meals/:id", (req, res) => {
  db.query("DELETE FROM meals WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "deleted" });
  });
});

// =====================
// CREATE REQUEST
// =====================
app.post("/api/requests", (req, res) => {
  const { meal_id, consumer_id, portions, note } = req.body;

  const sql = `
    INSERT INTO requests (meal_id, consumer_id, portions, note, status)
    VALUES (?, ?, ?, ?, 'pending')
  `;

  db.query(sql, [meal_id, consumer_id, portions, note], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "ok" });
  });
});

// =====================
// GET REQUESTS (COOK)
// =====================
app.get("/api/requests/:cook_id", (req, res) => {
  const cookId = req.params.cook_id;

  const sql = `
    SELECT requests.id, requests.portions, requests.note, users.username, meals.title
    FROM requests
    JOIN meals ON requests.meal_id = meals.id
    JOIN users ON requests.consumer_id = users.id
    WHERE meals.user_id = ? AND requests.status = 'pending'
  `;

  db.query(sql, [cookId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});
// COMPLETE REQUEST (consumer)
app.post("/api/requests/complete", (req, res) => {
  const { request_id } = req.body;

  const sql = `
    UPDATE requests 
    SET status = 'completed'
    WHERE id = ?
  `;

  db.query(sql, [request_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "completed" });
  });
});
// GET MY REQUESTS (consumer)
app.get("/api/myrequests/:user_id", (req, res) => {
  const userId = req.params.user_id;

  const sql = `
    SELECT requests.id, requests.portions, meals.title
    FROM requests
    JOIN meals ON requests.meal_id = meals.id
    WHERE requests.consumer_id = ?
      AND requests.status = 'pending'
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});
// =====================
// ACCEPT REQUEST
// =====================
app.post("/api/requests/accept", (req, res) => {
  const { request_id, portions } = req.body;

  db.query("SELECT meal_id FROM requests WHERE id = ?", [request_id], (err, result) => {
    if (err) return res.status(500).json(err);

    const mealId = result[0].meal_id;

    db.query(
      "UPDATE meals SET portions = portions - ? WHERE id = ?",
      [portions, mealId],
      (err2) => {
        if (err2) return res.status(500).json(err2);

        db.query(
          "UPDATE requests SET status = 'accepted' WHERE id = ?",
          [request_id],
          (err3) => {
            if (err3) return res.status(500).json(err3);

            res.json({ message: "done" });
          }
        );
      }
    );
  });
});

// =====================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});