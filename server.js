const express = require("express");
const cors = require("cors");
const db = require("./db");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());
// =====================
// LOGIN
// =====================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = result[0];

    // SIMPLE PASSWORD CHECK
    if (password !== user.password) {
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

app.post("/api/register", (req, res) => {
  const { username, email, password, role } = req.body;

  const sql = `
    INSERT INTO users (username, email, password, role)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [username, email, password, role], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }

    res.json({ message: "registered" });
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
    INSERT INTO requests (meal_id, user_id, portions, note, status)
    VALUES (?, ?, ?, ?, 'pending')
  `;

  db.query(sql, [meal_id, consumer_id, portions, note], (err) => {
    if (err) {
      console.log("SQL ERROR:", err);
      return res.status(500).json(err);
    }

    res.json({ message: "ok" });
  });
});

// =====================
// GET REQUESTS (COOK)
// =====================
app.get("/api/requests/:cook_id", (req, res) => {
  const cookId = req.params.cook_id;

  const sql = `
    SELECT 
      requests.id,
      requests.portions,
      users.username,
      meals.title
    FROM requests
    JOIN meals ON requests.meal_id = meals.id
    JOIN users ON requests.user_id = users.id
    WHERE meals.user_id = ? AND requests.status = 'pending'
  `;

  db.query(sql, [cookId], (err, result) => {
    if (err) {
      console.log("ERROR:", err);
      return res.status(500).json(err);
    }

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

    // μείωση μερίδων
    db.query(
      "UPDATE meals SET portions = portions - ? WHERE id = ?",
      [portions, mealId],
      (err2) => {
        if (err2) return res.status(500).json(err2);

        // update status
        db.query(
          "UPDATE requests SET status = 'accepted' WHERE id = ?",
          [request_id],
          (err3) => {
            if (err3) return res.status(500).json(err3);

            res.json({ message: "accepted" });
          }
        );
      }
    );
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

            res.json({ message: "accepted" });
          }
        );
      }
    );
  });
});

// =====================
// REJECT REQUEST
// =====================
app.post("/api/requests/reject", (req, res) => {
  const { request_id } = req.body;

  db.query(
    "UPDATE requests SET status = 'rejected' WHERE id = ?",
    [request_id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "rejected" });
    }
  );
});


// =====================
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});