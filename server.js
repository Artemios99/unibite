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

// GET MEALS - last 48 hours, including 0 portions
app.get("/api/meals", (req, res) => {
  const sql = `
    SELECT 
      meals.*,
      users.username AS cook_name
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
    (
      user_id,
      title,
      description,
      portions,
      location,
      latitude,
      longitude,
      pickup_time,
      price,
      allergens
    )
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

      res.json({
        message: "ok",
      });
    }
  );
});


// DELETE MEAL
app.delete("/api/meals/:id", (req, res) => {

  const mealId = req.params.id;

  const deleteRequestsSql = `
    DELETE FROM requests
    WHERE meal_id = ?
  `;

  db.query(deleteRequestsSql, [mealId], (err) => {

    if (err) {
      return res.status(500).json(err);
    }

    const deleteMealSql = `
      DELETE FROM meals
      WHERE id = ?
    `;

    db.query(deleteMealSql, [mealId], (err) => {

      if (err) {
        return res.status(500).json(err);
      }

      res.json({
        success: true,
      });

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
      requests.portions,
      requests.note,
      requests.status,
      requests.picked_up,
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

// ACCEPT REQUEST
app.post("/api/requests/accept", (req, res) => {
  const { request_id, portions } = req.body;

  const getRequestSql = `
    SELECT meal_id
    FROM requests
    WHERE id = ?
  `;

  db.query(getRequestSql, [request_id], (err, requestResult) => {
    if (err) return res.status(500).json(err);

    if (requestResult.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    const mealId = requestResult[0].meal_id;

    const updateMealSql = `
      UPDATE meals
      SET portions = portions - ?
      WHERE id = ? AND portions >= ?
    `;

    db.query(updateMealSql, [portions, mealId, portions], (err, mealResult) => {
      if (err) return res.status(500).json(err);

      if (mealResult.affectedRows === 0) {
        return res.status(400).json({
          message: "Δεν υπάρχουν αρκετές μερίδες",
        });
      }

      const updateRequestSql = `
        UPDATE requests
        SET status = 'approved'
        WHERE id = ?
      `;

      db.query(updateRequestSql, [request_id], (err) => {
        if (err) return res.status(500).json(err);

        res.json({ success: true });
      });
    });
  });
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



// =====================
// PICKUP REQUEST
// =====================
app.post("/api/requests/pickup", (req, res) => {

  const { request_id } = req.body;

  const sql = `
    UPDATE requests
    SET picked_up = 1
    WHERE id = ?
  `;

  db.query(sql, [request_id], (err) => {

    if (err) {
      return res.status(500).json(err);
    }

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
    SET 
      user_id = ?,
      title = ?,
      description = ?,
      portions = ?,
      location = ?,
      latitude = ?,
      longitude = ?,
      pickup_time = ?,
      price = ?,
      allergens = ?
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
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});