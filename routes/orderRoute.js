const express = require("express");
const orderRoutes = express.Router();

// Order Controllers Import
const {
  createOrder,
  startChatSession,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  verifyPayment,
  updateSessionMode,
  submitUTR,
  verifyUTRByAdmin,
} = require("../controllers/orderController");

// Middlewares Import
const { protect } = require("../middlewares/authMiddleware");
const { admin } = require("../middlewares/adminMiddleware");

/////////////////////////////////
// ORDER ROUTES (Static routes sabse upar)
/////////////////////////////////

// 1. Create Order & Get All Orders (Admin Only)
orderRoutes
  .route("/")
  .post(protect, createOrder)
  .get(protect, admin, getAllOrders);

// 2. Logged-in User Orders
orderRoutes.route("/myorders").get(protect, getMyOrders);

// 3. Razorpay Payment Signature Verify
orderRoutes.route("/verify-payment").post(protect, verifyPayment);

// 4. Update Session Mode - Video / Audio / Chat (CRITICAL ROUTE)
orderRoutes.route("/update-session-mode").post(protect, updateSessionMode);

// 5. Submit Manual UTR / Transaction ID
orderRoutes.route("/submit-utr").post(protect, submitUTR);

// 6. Admin Approve / Reject UTR
orderRoutes.route("/admin/verify-utr").post(protect, admin, verifyUTRByAdmin);

/////////////////////////////////
// DYNAMIC ROUTES (Hamesha static routes ke niche)
/////////////////////////////////

// 7. Single Order Details
orderRoutes.route("/:id").get(protect, getOrderById);

// 8. Start Session (Chat / Audio / Video)
orderRoutes.route("/:id/start-chat").put(protect, startChatSession);
orderRoutes.route("/:id/start-session").put(protect, startChatSession);

// 9. Order Status Update (Admin Only)
orderRoutes.route("/:id/status").put(protect, admin, updateOrderStatus);

module.exports = orderRoutes;