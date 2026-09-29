const express = require("express");

const {
  addProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  getNearbyProducts,
  comparePrices,
} = require("../controllers/productController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ==========================================
// FARMER PRODUCT ROUTES
// ==========================================

// Add product
router.post(
  "/add",
  authMiddleware,
  addProduct
);


// Get logged-in farmer's products
router.get(
  "/my-products",
  authMiddleware,
  getMyProducts
);


// Update logged-in farmer's product
router.put(
  "/:id",
  authMiddleware,
  updateProduct
);


// Delete logged-in farmer's product
router.delete(
  "/:id",
  authMiddleware,
  deleteProduct
);


// ==========================================
// BUYER / PUBLIC ROUTES
// ==========================================

// Get nearby products
router.get(
  "/nearby",
  getNearbyProducts
);


// Compare nearby prices
router.get(
  "/compare-prices",
  comparePrices
);


// Get all products
router.get(
  "/",
  getAllProducts
);


// Get product by ID
router.get(
  "/:id",
  getProductById
);


module.exports = router;