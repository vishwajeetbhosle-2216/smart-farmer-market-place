const express = require("express");

const {
  getAllUsers,
  getAllProducts,
  getAllOrders,
  toggleUserStatus,
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get(
  "/users",
  authMiddleware,
  adminMiddleware,
  getAllUsers
);

router.get(
  "/products",
  authMiddleware,
  adminMiddleware,
  getAllProducts
);

router.get(
  "/orders",
  authMiddleware,
  adminMiddleware,
  getAllOrders
);

router.put(
  "/users/:id/status",
  authMiddleware,
  adminMiddleware,
  toggleUserStatus
);

module.exports = router;