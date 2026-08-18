const express = require('express');
const bookingRoutes = express.Router();
const { createBooking } = require('../controllers/bookingController');
const { protect } = require('../middlewares/authMiddleware');
// const { protect } = require('../middleware/authMiddleware'); // Agar Auth required hai

// POST api/bookings
bookingRoutes.post('/',protect, createBooking); // Pehle 'protect' middleware bhi laga sakte ho

module.exports = bookingRoutes;