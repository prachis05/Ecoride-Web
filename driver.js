const express = require("express");
const router = express.Router();
const db = require("../db"); // Assuming you modularize DB in future

// GET stats for a driver
router.get("/:driverId/stats", (req, res) => {
  const driverId = req.params.driverId;

  const offeredQuery = `
    SELECT COUNT(*) AS ridesOffered FROM rides WHERE driver_id = ?
  `;
  const upcomingQuery = `
    SELECT COUNT(*) AS upcomingRides 
    FROM rides 
    WHERE driver_id = ? AND start_time >= NOW()
  `;

  db.query(offeredQuery, [driverId], (err, offeredResult) => {
    if (err) {
      console.error("Error fetching offered rides:", err);
      return res.status(500).json({ error: "Database error" });
    }

    db.query(upcomingQuery, [driverId], (err, upcomingResult) => {
      if (err) {
        console.error("Error fetching upcoming rides:", err);
        return res.status(500).json({ error: "Database error" });
      }

      res.json({
        ridesOffered: offeredResult[0].ridesOffered,
        upcomingRides: upcomingResult[0].upcomingRides
      });
    });
  });
});

module.exports = router;
