const db = require('../db');

// Controller for handling booking operations
const BookingsController = {
  createBooking: (req, res) => {
    const {
      ride_id,
      seats_booked,
      total_price,
      id_type_id,
      id_number,
      gender
    } = req.body;

    const passenger_id = req.user.id;

    // Validate required fields
    if (!ride_id || !seats_booked || !total_price || !id_type_id || !id_number) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    // Step 1: Check if ride exists and has seats
    db.query('SELECT available_seats FROM rides WHERE ride_id = ?', [ride_id], (err, rideResults) => {
      if (err) {
        console.error('Error fetching ride:', err);
        return res.status(500).json({ success: false, message: 'Database error while fetching ride' });
      }

      if (!rideResults || rideResults.length === 0) {
        return res.status(404).json({ success: false, message: 'Ride not found' });
      }

      const availableSeats = rideResults[0].available_seats;
      if (availableSeats < seats_booked) {
        return res.status(400).json({ success: false, message: 'Not enough seats available' });
      }

      // Step 2: Check if user exists
      db.query('SELECT user_id FROM users WHERE user_id = ?', [passenger_id], (err, userResults) => {
        if (err) {
          console.error('Error checking user:', err);
          return res.status(500).json({ success: false, message: 'Database error while checking user' });
        }

        if (!userResults || userResults.length === 0) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Step 3: Create the booking
        db.query(
          `INSERT INTO bookings 
           (ride_id, passenger_id, seats_booked, total_price, booking_status, id_type_id, id_number, gender)
           VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
          [ride_id, passenger_id, seats_booked, total_price, id_type_id, id_number, gender],
          (err, insertResult) => {
            if (err) {
              console.error('Error inserting booking:', err);
              return res.status(500).json({ success: false, message: 'Error creating booking' });
            }

            // Step 4: Update available seats
            db.query(
              'UPDATE rides SET available_seats = available_seats - ? WHERE ride_id = ?',
              [seats_booked, ride_id],
              (err, updateResult) => {
                if (err) {
                  console.error('Error updating seats:', err);
                  return res.status(500).json({ success: false, message: 'Booking created but failed to update seats' });
                }

                return res.status(201).json({
                  success: true,
                  message: 'Booking created successfully',
                  booking_id: insertResult.insertId
                });
              }
            );
          }
        );
      });
    });
  },

  // Get bookings for a specific user
  getUserBookings: async (req, res) => {
    const { user_id } = req.params;

    try {
      const [rows] = await db.execute(
        `SELECT b.*, r.source, r.destination, r.start_time, r.price_per_seat,
         u.name as driver_name
         FROM bookings b
         JOIN rides r ON b.ride_id = r.id
         JOIN users u ON r.driver_id = u.user_id
         WHERE b.passenger_id = ?
         ORDER BY b.booking_time DESC`,
        [user_id]
      );

      return res.status(200).json({ success: true, bookings: rows });
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  // Get bookings for a specific ride
  getRideBookings: async (req, res) => {
    const { ride_id } = req.params;

    try {
      const [rows] = await db.execute(
        `SELECT b.*, u.name, u.email, u.phone
         FROM bookings b
         JOIN users u ON b.passenger_id = u.user_id
         WHERE b.ride_id = ?
         ORDER BY b.booking_time DESC`,
        [ride_id]
      );

      return res.status(200).json({ success: true, bookings: rows });
    } catch (error) {
      console.error('Error fetching ride bookings:', error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  // Update booking status
  updateBookingStatus: async (req, res) => {
    const { booking_id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    try {
      // Get current booking data
      const [bookingRows] = await db.execute(
        'SELECT ride_id, seats_booked, booking_status FROM bookings WHERE booking_id = ?',
        [booking_id]
      );

      if (bookingRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      const currentBooking = bookingRows[0];
      
      // If cancelling a booking that wasn't cancelled before
      if (status === 'CANCELLED' && currentBooking.booking_status !== 'CANCELLED') {
        // Return seats to the ride's available seats
        await db.execute(
          'UPDATE rides SET available_seats = available_seats + ? WHERE id = ?',
          [currentBooking.seats_booked, currentBooking.ride_id]
        );
      }
      
      // If reactivating a previously cancelled booking
      if (status !== 'CANCELLED' && currentBooking.booking_status === 'CANCELLED') {
        // Check if seats are still available
        const [rideRows] = await db.execute(
          'SELECT available_seats FROM rides WHERE id = ?',
          [currentBooking.ride_id]
        );
        
        if (rideRows[0].available_seats < currentBooking.seats_booked) {
          return res.status(400).json({ 
            success: false, 
            message: 'Cannot reactivate booking: not enough seats available' 
          });
        }
        
        // Deduct seats again
        await db.execute(
          'UPDATE rides SET available_seats = available_seats - ? WHERE id = ?',
          [currentBooking.seats_booked, currentBooking.ride_id]
        );
      }

      // Update the booking status
      const [result] = await db.execute(
        'UPDATE bookings SET booking_status = ? WHERE booking_id = ?',
        [status, booking_id]
      );

      if (result.affectedRows > 0) {
        return res.status(200).json({ success: true, message: `Booking status updated to ${status}` });
      } else {
        return res.status(500).json({ success: false, message: 'Failed to update booking status' });
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  },

  // Get booking details by ID
  getBookingById: async (req, res) => {
    const { booking_id } = req.params;

    try {
      const [rows] = await db.execute(
        `SELECT b.*, r.source, r.destination, r.start_time, r.price_per_seat,
         u_driver.name as driver_name, u_passenger.name as passenger_name
         FROM bookings b
         JOIN rides r ON b.ride_id = r.id
         JOIN users u_driver ON r.driver_id = u_driver.user_id
         JOIN users u_passenger ON b.passenger_id = u_passenger.user_id
         WHERE b.booking_id = ?`,
        [booking_id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      return res.status(200).json({ success: true, booking: rows[0] });
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
};

module.exports = BookingsController;