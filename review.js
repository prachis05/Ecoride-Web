const express = require("express");
const router = express.Router();
const db = require("../db"); // adjust according to your DB connection

router.post("/", (req, res) => {
  const { ride_id, user_id, rating, comments } = req.body;

  const sql = `INSERT INTO reviews (ride_id, user_id, rating, comments) VALUES (?, ?, ?, ?)`;

  db.query(sql, [ride_id, user_id, rating, comments], (err, result) => {
    if (err) {
      console.error("Error saving review:", err);
      return res.status(500).json({ success: false, message: "Failed to save review" });
    }
    res.json({ success: true, message: "Review saved successfully" });
  });
});

module.exports = router;
