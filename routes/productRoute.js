const express = require("express");
const productRoutes = express.Router();

// Product Controllers import kar rahe hain
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// Middlewares import kar rahe hain (Authentication & Authorization)
const { protect } = require("../middlewares/authMiddleware");
const { admin } = require("../middlewares/adminMiddleware");

/////////////////////////////////
// PRODUCT ROUTES
/////////////////////////////////

// 1. Saare products fetch karo (GET) & Naya product add karo (POST - Admin Only)
// Endpoint: /api/products
productRoutes
  .route("/")
  .get(getProducts)
  .post(protect, admin, createProduct);

// 2. Single product ki detail fetch karo (GET), Edit karo (PUT - Admin Only), Delete karo (DELETE - Admin Only)
// Endpoint: /api/products/:id
productRoutes
  .route("/:id")
  .get(getProductById)
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

module.exports = productRoutes;