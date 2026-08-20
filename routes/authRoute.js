const express = require("express");
const authRoutes = express.Router();

// Controllers import kar rahe hain
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  logoutUser
} = require("../controllers/authController");

// Authentication Middleware import kar rahe hain
const { protect,admin } = require("../middlewares/authMiddleware");
const { authLimiter } = require("../middlewares/rateLimitter");

/////////////////////////////////
// AUTHENTICATION ROUTES
/////////////////////////////////

// 1. User Registration Route
// Endpoint: POST /api/auth/register
// Access: Public
authRoutes.post("/register",authLimiter, registerUser);

// 2. User Login Route
// Endpoint: POST /api/auth/login
// Access: Public
authRoutes.post("/login",authLimiter, loginUser);

// 3. Get User Profile Route
// Endpoint: GET /api/auth/profile
// Access: Private (Requires Valid JWT Token)
authRoutes.get("/profile", protect, getUserProfile);

authRoutes.put("/profile", protect, updateUserProfile);

// Admin kisi bhi user ko delete kar sakta hai ID se
authRoutes.delete("/:id", protect, admin, deleteUser);



authRoutes.get("/logout",logoutUser);


module.exports = authRoutes;