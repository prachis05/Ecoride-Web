const db = require('../db');
const { verifyToken, verifyDriver } = require('../middleware/authmiddleware');

// ✅ Create Ride (Only Drivers)
exports.createRide = [verifyToken, verifyDriver, (req, res) => {
  const { source, destination, start_time, available_seats, price_per_seat, vehicle_model, license_plate } = req.body;
  const driver_id = req.user.id;

  try {
    const formattedStartTime = formatDateForMySQL(start_time);

    const callProcedure = `
      CALL CreateRide(?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(callProcedure, [
      driver_id, source, destination, formattedStartTime,
      available_seats, price_per_seat, vehicle_model, license_plate
    ], (err, result) => {
      if (err) {
        console.error("Stored Procedure Call Error:", err);
        return res.status(500).json({ error: 'Failed to create ride via procedure', details: err });
      }
      res.status(201).json({ message: 'Ride created successfully via procedure' });
    });
  } catch (error) {
    console.error("Date Formatting Error:", error.message);
    res.status(400).json({ error: error.message });
  }
}];


// ✅ Get All Rides (Public)
exports.getAllRides = (req, res) => {
  db.query('SELECT * FROM rides', (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch rides' });
    res.status(200).json(results);
  });
};

exports.searchRides = (req, res) => {
  const { source, destination, date, passengers } = req.query;
  console.log("Received request with params:", req.query);

  let query = `
    SELECT r.*, u.name AS driver_name, u.phone AS driver_phone
    FROM rides r
    JOIN users u ON r.driver_id = u.user_id
    WHERE r.available_seats >= ? AND r.start_time > NOW()
      
  `;
  const queryParams = [passengers || 1];

  if (source) {
    query += ` AND r.source LIKE ?`;
    queryParams.push(`%${source}%`);
  }

  if (destination) {
    query += ` AND r.destination LIKE ?`;
    queryParams.push(`%${destination}%`);
  }

  if (date) {
    query += ` AND DATE(r.start_time) = ?`;
    queryParams.push(date);
  }

  query += ` ORDER BY r.start_time ASC`;

  db.query(query, queryParams, (err, results) => {
    if (err) {
      console.error('Search rides error:', err);
      return res.status(500).json({ error: 'Failed to search rides', details: err });
    }

    const formattedResults = results.map(ride => ({
      ...ride,
      start_time_formatted: formatDateForDisplay(ride.start_time)
    }));

    res.json(formattedResults);
  });
};

// ✅ Get Ride by ID (Public)
exports.getRideById = (req, res) => {

  const rideId = req.params.id;
  db.query('SELECT * FROM rides WHERE ride_id = ?', [rideId], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch ride' });
    if (results.length === 0) return res.status(404).json({ error: 'Ride not found' });
    res.status(200).json(results[0]);
  });
};

// ✅ Delete Ride (Only Drivers who created the ride)
exports.deleteRide = [verifyToken, verifyDriver, (req, res) => {
  const rideId = req.params.id;
  const driver_id = req.user.id;

  db.query('SELECT * FROM rides WHERE ride_id = ? AND driver_id = ?', [rideId, driver_id], (err, results) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch ride' });
    if (results.length === 0) return res.status(403).json({ error: 'Ride not found or unauthorized' });

    db.query('DELETE FROM rides WHERE ride_id = ?', [rideId], (err) => {
      if (err) return res.status(500).json({ error: 'Failed to delete ride' });
      res.status(200).json({ message: 'Ride deleted successfully' });
    });
  });
}];

// ✅ Format Date for MySQL
function formatDateForMySQL(dateString) {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
function formatDateForDisplay(date) {
  return new Date(date).toISOString().split("T")[0]; // Converts to YYYY-MM-DD format
}

