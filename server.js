const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server OK");
});

// LOGIN
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = result[0];

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

// REGISTER
app.post("/api/register", (req, res) => {
  const { username, email, password, role } = req.body;

  const sql = `
    INSERT INTO users (username, email, password, role, points)
    VALUES (?, ?, ?, ?, 5)
  `;

  db.query(sql, [username, email, password, role], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "registered" });
  });
});

// GET MEALS
app.get("/api/meals", (req, res) => {
  const sql = `
    SELECT meals.*, users.username AS cook_name
    FROM meals
    JOIN users ON meals.user_id = users.id
    WHERE meals.created_at >= NOW() - INTERVAL 48 HOUR
    ORDER BY meals.created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ADD MEAL
app.post("/api/meals", (req, res) => {
  const {
    user_id,
    title,
    description,
    portions,
    location,
    latitude,
    longitude,
    pickup_time,
    price,
    allergens,
  } = req.body;

  const sql = `
    INSERT INTO meals 
    (user_id, title, description, portions, location, latitude, longitude, pickup_time, price, allergens)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      user_id,
      title,
      description,
      portions,
      location,
      latitude,
      longitude,
      pickup_time,
      price,
      allergens,
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "ok" });
    }
  );
});

// UPDATE MEAL
app.put("/api/meals/:id", (req, res) => {
  const mealId = req.params.id;

  const {
    user_id,
    title,
    description,
    portions,
    location,
    latitude,
    longitude,
    pickup_time,
    price,
    allergens,
  } = req.body;

  const sql = `
    UPDATE meals
    SET user_id = ?, title = ?, description = ?, portions = ?, location = ?,
        latitude = ?, longitude = ?, pickup_time = ?, price = ?, allergens = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      user_id,
      title,
      description,
      portions,
      location,
      latitude,
      longitude,
      pickup_time,
      price,
      allergens,
      mealId,
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "updated" });
    }
  );
});

// DELETE MEAL
app.delete("/api/meals/:id", (req, res) => {
  const mealId = req.params.id;

  db.query("DELETE FROM requests WHERE meal_id = ?", [mealId], (err) => {
    if (err) return res.status(500).json(err);

    db.query("DELETE FROM meals WHERE id = ?", [mealId], (err2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ success: true });
    });
  });
});

// CREATE REQUEST
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

// GET REQUESTS FOR COOK
app.get("/api/requests/:cookId", (req, res) => {
  const cookId = req.params.cookId;

  const sql = `
    SELECT 
      requests.id,
      requests.meal_id,
      requests.consumer_id,
      requests.portions,
      requests.note,
      requests.status,
      requests.picked_up,
      requests.picked_up_at,
      users.username,
      meals.title
    FROM requests
    JOIN meals ON requests.meal_id = meals.id
    JOIN users ON requests.consumer_id = users.id
    WHERE meals.user_id = ?
    ORDER BY requests.id DESC
  `;

  db.query(sql, [cookId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// GET REQUESTS FOR CONSUMER
app.get("/api/myrequests/:consumerId", (req, res) => {
  const consumerId = req.params.consumerId;

  const sql = `
    SELECT 
      requests.id,
      requests.meal_id,
      requests.consumer_id,
      requests.portions,
      requests.note,
      requests.status,
      requests.picked_up,
      requests.picked_up_at,
      meals.title,
      meals.description,
      meals.location,
      meals.pickup_time,
      meals.price,
      users.username AS cook_name
    FROM requests
    JOIN meals ON requests.meal_id = meals.id
    JOIN users ON meals.user_id = users.id
    WHERE requests.consumer_id = ?
    ORDER BY requests.id DESC
  `;

  db.query(sql, [consumerId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// ACCEPT REQUEST
app.post("/api/requests/accept", (req, res) => {
  const { request_id, portions } = req.body;

  db.query(
    "SELECT meal_id FROM requests WHERE id = ?",
    [request_id],
    (err, requestResult) => {
      if (err) return res.status(500).json(err);

      if (requestResult.length === 0) {
        return res.status(404).json({ message: "Request not found" });
      }

      const mealId = requestResult[0].meal_id;

      db.query(
        "UPDATE meals SET portions = portions - ? WHERE id = ? AND portions >= ?",
        [portions, mealId, portions],
        (err2, mealResult) => {
          if (err2) return res.status(500).json(err2);

          if (mealResult.affectedRows === 0) {
            return res.status(400).json({
              message: "Δεν υπάρχουν αρκετές μερίδες",
            });
          }

          db.query(
            "UPDATE requests SET status = 'accepted' WHERE id = ?",
            [request_id],
            (err3) => {
              if (err3) return res.status(500).json(err3);
              res.json({ success: true });
            }
          );
        }
      );
    }
  );
});

// REJECT REQUEST
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

// PICKUP REQUEST
app.post("/api/requests/pickup", (req, res) => {
  const { request_id } = req.body;

  const sql = `
    UPDATE requests
    SET picked_up = 1,
        picked_up_at = NOW()
    WHERE id = ?
  `;

  db.query(sql, [request_id], (err) => {
    if (err) return res.status(500).json(err);

    res.json({
      success: true,
    });
  });
});

// NOT PICKED UP REQUEST
app.post("/api/requests/not-pickup", (req, res) => {
  const { request_id } = req.body;

  const sql = `
    UPDATE requests
    SET picked_up = 0
    WHERE id = ?
  `;

  db.query(sql, [request_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// GET PENDING RATINGS FOR CONSUMER
app.get("/api/ratings/pending/:consumerId", (req, res) => {
  const consumerId = req.params.consumerId;

  const sql = `
    SELECT 
      requests.id AS request_id,
      requests.consumer_id,
      requests.picked_up,
      requests.picked_up_at,
      requests.rating_penalty_applied,
      TIMESTAMPDIFF(HOUR, requests.picked_up_at, NOW()) AS hours_passed,
      meals.id AS meal_id,
      meals.title,
      meals.description,
      users.username AS cook_name
    FROM requests
    JOIN meals ON requests.meal_id = meals.id
    JOIN users ON meals.user_id = users.id
    LEFT JOIN ratings ON ratings.request_id = requests.id
    WHERE requests.consumer_id = ?
      AND requests.picked_up = 1
      AND ratings.id IS NULL
  `;

  db.query(sql, [consumerId], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// CHECK EXPIRED RATINGS
app.post("/api/ratings/check-expired/:consumerId", (req, res) => {
  const consumerId = req.params.consumerId;

  const findExpiredSql = `
    SELECT requests.id
    FROM requests
    LEFT JOIN ratings ON ratings.request_id = requests.id
    WHERE requests.consumer_id = ?
      AND requests.picked_up = 1
      AND requests.picked_up_at IS NOT NULL
      AND requests.rating_penalty_applied = 0
      AND ratings.id IS NULL
      AND NOW() > DATE_ADD(requests.picked_up_at, INTERVAL 48 HOUR)
  `;

  db.query(findExpiredSql, [consumerId], (err, expiredRequests) => {
    if (err) return res.status(500).json(err);

    if (expiredRequests.length === 0) {
      return res.json({ success: true, penalty_applied: false });
    }

    const requestIds = expiredRequests.map((r) => r.id);

    db.query(
      "UPDATE users SET points = GREATEST(points - 1, 0) WHERE id = ?",
      [consumerId],
      (err2) => {
        if (err2) return res.status(500).json(err2);

        db.query(
          "UPDATE requests SET rating_penalty_applied = 1 WHERE id IN (?)",
          [requestIds],
          (err3) => {
            if (err3) return res.status(500).json(err3);

            res.json({
              success: true,
              penalty_applied: true,
              expired_count: expiredRequests.length,
            });
          }
        );
      }
    );
  });
});

// SUBMIT RATING
app.post("/api/ratings", (req, res) => {
  const { request_id, meal_id, user_id, rating } = req.body;

  const pointsToCook = Number(rating) > 3 ? 2 : 1;

  const insertRatingSql = `
    INSERT INTO ratings (request_id, meal_id, user_id, rating)
    VALUES (?, ?, ?, ?)
  `;

  db.query(insertRatingSql, [request_id, meal_id, user_id, rating], (err) => {
    if (err) return res.status(500).json(err);

    const updateCookSql = `
      UPDATE users
      JOIN meals ON meals.user_id = users.id
      SET users.points = users.points + ?
      WHERE meals.id = ?
    `;

    db.query(updateCookSql, [pointsToCook, meal_id], (err2) => {
      if (err2) return res.status(500).json(err2);

      db.query(
        "UPDATE requests SET status = 'completed' WHERE id = ?",
        [request_id],
        (err3) => {
          if (err3) return res.status(500).json(err3);

          res.json({
            message: "rated",
            cook_points_added: pointsToCook,
          });
        }
      );
    });
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});