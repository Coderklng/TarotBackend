const express = require("express");
const paymentRoutes = express.Router();
const { protect,admin } = require("../middlewares/authMiddleware");
const {
  createPaymentOrder,
  verifyRazorpayPayment,
  verifyStripePayment,
  createManualUpiOrder,
  approveManualPayment,
  getAllPayments
} = require("../controllers/paymentController");

// Dynamic Order creation (dono gateway ke liye)
paymentRoutes.post("/create-order", protect, createPaymentOrder);

// Manual UPI Endpoints (QR / UTR Verification)
paymentRoutes.post("/manual-upi", protect, createManualUpiOrder);
paymentRoutes.put("/approve-manual/:orderId", protect, approveManualPayment);

// Payment History & Analytics
paymentRoutes.get("/all", protect,admin, getAllPayments);

// Verification Endpoints (Gateway Callbacks)
paymentRoutes.post("/razorpay/verify", protect, verifyRazorpayPayment);
paymentRoutes.post("/stripe/verify", protect, verifyStripePayment);

module.exports = paymentRoutes;