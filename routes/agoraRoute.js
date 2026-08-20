const express = require('express');

// 1. Controller require (Destructuring use karein kyunki controller mein object export kiya hai)
const { getAgoraToken } = require('../controllers/agoraController');

// 2. Middleware require
const { protect } = require("../middlewares/authMiddleware");

const agoraRoutes = express.Router();

// Dynamic Route: GET /api/agora/token/:orderId
agoraRoutes.get('/token/:orderId', getAgoraToken);

module.exports = agoraRoutes;