const express = require("express");
const router = express.Router();
const { getCart, addToCart, removeFromCart } = require("../controllers/cartController");
const { protect } = require("../middlewares/authMiddleware");

// Saare cart routes private hain (Cookie/JWT Auth required)
router.route("/")
  .get(protect, getCart)
  .post(protect, addToCart);

router.route("/:productId")
  .delete(protect, removeFromCart);

module.exports = router;