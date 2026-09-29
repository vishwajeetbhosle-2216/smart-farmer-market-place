const express = require("express");

const {
  createOrder,
  checkoutCart,
  getFarmerOrders,
  updateOrderStatus,
  verifyDeliveryOtp,
  getBuyerOrders,
  requestReturn,
  reviewReturnRequest,
  scheduleReturnPickup,
  generatePickupOtp,
  markReturnCollected,
  inspectReturnedProduct,
  resolveReturnDispute,
  updateRefundStatus,
} = require("../controllers/orderController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// =====================================
// BUYER - CREATE SINGLE PRODUCT ORDER
// =====================================

router.post(
  "/create",
  authMiddleware,
  roleMiddleware("buyer"),
  createOrder
);

// =====================================
// BUYER - MULTI-PRODUCT CART CHECKOUT
// =====================================

router.post(
  "/checkout",
  authMiddleware,
  roleMiddleware("buyer"),
  checkoutCart
);

// =====================================
// FARMER - GET FARMER ORDERS
// =====================================

router.get(
  "/farmer-orders",
  authMiddleware,
  roleMiddleware("farmer"),
  getFarmerOrders
);

// =====================================
// BUYER - GET BUYER ORDERS
// =====================================

router.get(
  "/buyer-orders",
  authMiddleware,
  roleMiddleware("buyer"),
  getBuyerOrders
);

// =====================================
// FARMER - UPDATE ORDER STATUS
// =====================================

router.put(
  "/:id/status",
  authMiddleware,
  roleMiddleware("farmer"),
  updateOrderStatus
);

// =====================================
// FARMER - VERIFY DELIVERY OTP
// =====================================

router.put(
  "/:id/delivery/verify",
  authMiddleware,
  roleMiddleware("farmer"),
  verifyDeliveryOtp
);

// =====================================
// BUYER - REQUEST PRODUCT RETURN
// =====================================

router.post(
  "/:id/return",
  authMiddleware,
  roleMiddleware("buyer"),
  requestReturn
);

// =====================================
// FARMER - REVIEW RETURN REQUEST
// =====================================

router.put(
  "/:id/return/review",
  authMiddleware,
  roleMiddleware("farmer"),
  reviewReturnRequest
);

// =====================================
// FARMER - SCHEDULE OR UPDATE PICKUP TIME
// =====================================

router.put(
  "/:id/return/pickup",
  authMiddleware,
  roleMiddleware("farmer"),
  scheduleReturnPickup
);

// =====================================
// FARMER - ARRIVE AND GENERATE PICKUP OTP
// =====================================

router.post(
  "/:id/return/arrive",
  authMiddleware,
  roleMiddleware("farmer"),
  generatePickupOtp
);

// =====================================
// FARMER - VERIFY PICKUP OTP AND COLLECT
// =====================================

router.put(
  "/:id/return/collect",
  authMiddleware,
  roleMiddleware("farmer"),
  markReturnCollected
);

// =====================================
// FARMER - INSPECT RETURNED PRODUCT
// =====================================

router.put(
  "/:id/return/inspect",
  authMiddleware,
  roleMiddleware("farmer"),
  inspectReturnedProduct
);

// =====================================
// ADMIN - RESOLVE RETURN DISPUTE
// =====================================

router.put(
  "/:id/return/resolve",
  authMiddleware,
  roleMiddleware("admin"),
  resolveReturnDispute
);

// =====================================
// FARMER - UPDATE REFUND STATUS
// =====================================

router.put(
  "/:id/return/refund",
  authMiddleware,
  roleMiddleware("farmer"),
  updateRefundStatus
);

// =====================================
// EXPORT ROUTER
// =====================================

module.exports = router;