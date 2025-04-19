const express = require('express');
const router = express.Router();
const BookingsController = require('../controllers/bookingscontroller');
const  authenticateUser  = require('../middleware/authmiddleware'); // Assuming you have auth middleware

// Create a new booking
router.post('/bookings', authenticateUser.verifyToken, BookingsController.createBooking);

// Get all bookings for a specific user
router.get('/user/:user_id', BookingsController.getUserBookings);

// Get all bookings for a specific ride
router.get('/ride/:ride_id',  BookingsController.getRideBookings);

// Get booking details by ID
router.get('/:booking_id', BookingsController.getBookingById);

// Update booking status
router.patch('/:booking_id/status',  BookingsController.updateBookingStatus);

module.exports = router;