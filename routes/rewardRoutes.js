const express = require('express');
const rewardRoutes = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { spinWheel } = require('../controllers/rewardController'); // Yahan sahi controller ka path dena hai

// POST /api/rewards/spin
rewardRoutes.post('/spin', protect, spinWheel);

module.exports = rewardRoutes;