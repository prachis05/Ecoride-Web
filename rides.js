const express = require('express');
const router = express.Router();
const rideController = require('../controllers/ridecontroller');
const { verifyToken, verifyDriver } = require('../middleware/authmiddleware');
const { route } = require('./auth');

// ✅ Route to create a new ride
router.post('/', verifyToken, verifyDriver, rideController.createRide);



router.get('/search', rideController.searchRides);

// ✅ Route to get a specific ride
router.get('/:id', rideController.getRideById);

// ✅ Route to delete a ride
router.delete('/:id', rideController.deleteRide);

router.get('/test', (req, res) => {
    res.send('Rides route is working!');
  });
  

module.exports = router;
