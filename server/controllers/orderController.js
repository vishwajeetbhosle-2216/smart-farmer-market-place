const mongoose = require("mongoose");

const Order = require("../models/order");
const Product = require("../models/product");
const crypto = require("crypto");
const User = require("../models/user");
const sendOtpEmail = require("../utils/sendOtpEmail");

// =====================================
// CREATE A SINGLE-PRODUCT ORDER
// =====================================

const createOrder = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        message: "Product and quantity are required",
      });
    }

    if (
      !Number.isFinite(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      return res.status(400).json({
        message: "Quantity must be greater than 0",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (product.status !== "Active") {
      return res.status(400).json({
        message: "This product is not available",
      });
    }

    if (
      product.expiryDate &&
      new Date(product.expiryDate) <= new Date()
    ) {
      return res.status(400).json({
        message: "This product has expired",
      });
    }

    const requestedQuantity = Number(quantity);

    if (requestedQuantity > product.quantityAvailable) {
      return res.status(400).json({
        message: "Not enough quantity available",
      });
    }

    // Atomically reserve stock.
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: product._id,
        status: "Active",
        quantityAvailable: {
          $gte: requestedQuantity,
        },
        $or: [
          { expiryDate: null },
          { expiryDate: { $gt: new Date() } },
        ],
      },
      {
        $inc: {
          quantityAvailable: -requestedQuantity,
        },
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(400).json({
        message:
          "Product stock changed or product is no longer available. Please refresh and try again.",
      });
    }

    try {
      const totalAmount =
        requestedQuantity * product.pricePerKg;
        const buyer = await User.findById(req.user.userId)
        .select("name location");

      const farmer = await User.findById(product.farmer)
        .select("name location");

      if (!buyer || !farmer) {
        throw new Error("Buyer or farmer details not found");
      }

      const invoiceSnapshot = {
        invoiceNumber: `SFM-${Date.now()}-${crypto
          .randomBytes(3)
          .toString("hex")
          .toUpperCase()}`,
        buyerName: buyer.name,
        buyerLocation: buyer.location?.coordinates || [],
        farmerName: farmer.name,
        farmerLocation:
          product.location?.coordinates ||
          farmer.location?.coordinates ||
          [],
        productName: product.name,
        productUnit: product.unit || "kg",
        generatedAt: new Date(),
      };

      const order = await Order.create({
        buyer: req.user.userId,
        farmer: product.farmer,
        product: product._id,
        quantity: requestedQuantity,
        pricePerKg: product.pricePerKg,
        totalAmount,
        status: "Pending",
        paymentMethod: "COD",
        paymentStatus: "Pending",
      });

      // Update status when stock reaches zero.
      if (updatedProduct.quantityAvailable === 0) {
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              status: "SoldOut",
            },
          }
        );
      }

      return res.status(201).json({
        message: "Order placed successfully",
        order,
      });
    } catch (error) {
      // Restore stock if order creation fails.
      await Product.updateOne(
        { _id: product._id },
        {
          $inc: {
            quantityAvailable: requestedQuantity,
          },
          $set: {
            status: "Active",
          },
        }
      );

      throw error;
    }
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      message: "Failed to create order",
      error: error.message,
    });
  }
};

// =====================================
// MULTI-PRODUCT CART CHECKOUT
// =====================================

const checkoutCart = async (req, res) => {
  const reservedItems = [];
  const createdOrderIds = [];

  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Your cart is empty",
      });
    }

    if (items.length > 30) {
      return res.status(400).json({
        message:
          "You can checkout a maximum of 30 products at once",
      });
    }

    // =====================================
    // 1. VALIDATE AND NORMALIZE CART ITEMS
    // =====================================

    const normalizedItems = [];
    const seenProductIds = new Set();

    for (const item of items) {
      const { productId, quantity } = item || {};

      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(productId)
      ) {
        return res.status(400).json({
          message:
            "One or more products in your cart have invalid IDs",
        });
      }

      const requestedQuantity = Number(quantity);

      if (
        !Number.isFinite(requestedQuantity) ||
        requestedQuantity <= 0
      ) {
        return res.status(400).json({
          message:
            "All product quantities must be greater than zero",
        });
      }

      if (seenProductIds.has(productId.toString())) {
        return res.status(400).json({
          message:
            "Your cart contains duplicate products. Please remove duplicates and try again.",
        });
      }

      seenProductIds.add(productId.toString());

      normalizedItems.push({
        productId,
        quantity: requestedQuantity,
      });
    }

    // =====================================
    // 2. LOAD PRODUCTS
    // =====================================

    const productIds = normalizedItems.map(
      (item) => item.productId
    );

    const products = await Product.find({
      _id: { $in: productIds },
    });

    const productMap = new Map(
      products.map((product) => [
        product._id.toString(),
        product,
      ])
    );

    // =====================================
    // 3. VALIDATE PRODUCT AVAILABILITY
    // =====================================

    for (const item of normalizedItems) {
      const product = productMap.get(
        item.productId.toString()
      );

      if (!product) {
        return res.status(404).json({
          message:
            "A product in your cart no longer exists",
        });
      }

      if (product.status !== "Active") {
        return res.status(400).json({
          message: `${product.name} is no longer available`,
        });
      }

      if (
        product.expiryDate &&
        new Date(product.expiryDate) <= new Date()
      ) {
        return res.status(400).json({
          message: `${product.name} has expired`,
        });
      }

      if (
        item.quantity > product.quantityAvailable
      ) {
        return res.status(400).json({
          message:
            `Not enough stock for ${product.name}. ` +
            `Available: ${product.quantityAvailable} ${
              product.unit || "kg"
            }`,
        });
      }
    }

    // =====================================
    // 4. RESERVE STOCK
    // =====================================

    for (const item of normalizedItems) {
      const product = productMap.get(
        item.productId.toString()
      );

      const now = new Date();

      const reservedProduct =
        await Product.findOneAndUpdate(
          {
            _id: product._id,
            status: "Active",
            quantityAvailable: {
              $gte: item.quantity,
            },
            $or: [
              { expiryDate: null },
              { expiryDate: { $gt: now } },
            ],
          },
          {
            $inc: {
              quantityAvailable: -item.quantity,
            },
          },
          { new: true }
        );

      if (!reservedProduct) {
        throw new Error(
          `Stock or availability changed for ${product.name}. Please refresh your cart and try again.`
        );
      }

      reservedItems.push({
        productId: product._id,
        quantity: item.quantity,
      });

      if (
        reservedProduct.quantityAvailable === 0
      ) {
        await Product.updateOne(
          { _id: product._id },
          {
            $set: {
              status: "SoldOut",
            },
          }
        );
      }
    }

    // =====================================
    // 5. FETCH BUYER DETAILS
    // =====================================

    const buyer = await User.findById(
      req.user.userId
    ).select("name location");

    if (!buyer) {
      throw new Error(
        "Buyer details not found. Please log in again."
      );
    }

    // =====================================
    // 6. FETCH ALL FARMER DETAILS
    // =====================================

    const farmerIds = [
      ...new Set(
        products.map((product) =>
          product.farmer.toString()
        )
      ),
    ];

    const farmers = await User.find({
      _id: { $in: farmerIds },
    }).select("name location");

    const farmerMap = new Map(
      farmers.map((farmer) => [
        farmer._id.toString(),
        farmer,
      ])
    );

    // =====================================
    // 7. CREATE ORDERS WITH INVOICE SNAPSHOTS
    // =====================================

    const ordersToCreate = normalizedItems.map(
      (item) => {
        const product = productMap.get(
          item.productId.toString()
        );

        const farmer = farmerMap.get(
          product.farmer.toString()
        );

        if (!farmer) {
          throw new Error(
            `Farmer details not found for ${product.name}`
          );
        }

        const totalAmount =
          item.quantity * product.pricePerKg;

        // Buyer location from buyer profile.
        const buyerCoordinates =
          buyer.location?.coordinates || [];

        // Prefer the location of the product listing.
        // If unavailable, use the farmer profile location.
        const farmerCoordinates =
          product.location?.coordinates?.length === 2
            ? product.location.coordinates
            : farmer.location?.coordinates || [];

        // Create a unique invoice number.
        const invoiceNumber =
          `SFM-${Date.now()}-${crypto
            .randomBytes(3)
            .toString("hex")
            .toUpperCase()}`;

        const invoiceSnapshot = {
          invoiceNumber,

          buyerName:
            buyer.name || "Buyer",

          buyerLocation:
            buyerCoordinates,

          farmerName:
            farmer.name || "Farmer",

          farmerLocation:
            farmerCoordinates,

          productName:
            product.name || "Product",

          productUnit:
            product.unit || "kg",

          generatedAt: new Date(),
        };

        return {
          buyer: req.user.userId,
          farmer: product.farmer,
          product: product._id,

          quantity: item.quantity,
          pricePerKg: product.pricePerKg,
          totalAmount,

          status: "Pending",
          paymentMethod: "COD",
          paymentStatus: "Pending",

          // Saved permanently with this order.
          invoiceSnapshot,
        };
      }
    );

    // =====================================
    // 8. SAVE ALL ORDERS
    // =====================================

    const createdOrders = await Order.insertMany(
      ordersToCreate,
      { ordered: true }
    );

    createdOrderIds.push(
      ...createdOrders.map(
        (order) => order._id
      )
    );

    // =====================================
    // 9. SEND CHECKOUT RESPONSE
    // =====================================

    return res.status(201).json({
      message:
        "Checkout successful. All orders have been placed.",

      orders: createdOrders,

      totalOrders: createdOrders.length,

      grandTotal: createdOrders.reduce(
        (total, order) =>
          total + order.totalAmount,
        0
      ),
    });

  } catch (error) {
    console.error(
      "Cart checkout error:",
      error
    );

    // =====================================
    // 10. REMOVE PARTIALLY CREATED ORDERS
    // =====================================

    if (createdOrderIds.length > 0) {
      try {
        await Order.deleteMany({
          _id: { $in: createdOrderIds },
        });
      } catch (rollbackError) {
        console.error(
          "Order rollback error:",
          rollbackError
        );
      }
    }

    // =====================================
    // 11. RESTORE RESERVED STOCK
    // =====================================

    for (const item of reservedItems) {
      try {
        await Product.updateOne(
          { _id: item.productId },
          {
            $inc: {
              quantityAvailable: item.quantity,
            },
            $set: {
              status: "Active",
            },
          }
        );
      } catch (rollbackError) {
        console.error(
          "Stock rollback error:",
          rollbackError
        );
      }
    }

    return res.status(500).json({
      message:
        error.message ||
        "Checkout failed. Please try again.",
    });
  }
};
// =====================================
// UPDATE ORDER STATUS BY FARMER
// =====================================

const updateOrderStatus = async (req, res) => {
  let session;

  try {
    const { status } = req.body;
    const farmerId = req.user.userId;
    const orderId = req.params.id;

    const allowedStatuses = [
      "Accepted",
      "Rejected",
      "Preparing",
      "Ready",
      "Completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status",
      });
    }
    // Prevent direct completion without delivery OTP
   if (status === "Completed") {
  return res.status(400).json({
    message:
      "Verify the delivery OTP before completing this order",
  });
}

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    // Handle rejection separately.
    // Stock restoration remains transactional.
    if (status === "Rejected") {
      session = await mongoose.startSession();

      let rejectedOrder = null;

      await session.withTransaction(async () => {
        rejectedOrder = await Order.findOneAndUpdate(
          {
            _id: orderId,
            farmer: farmerId,
            status: "Pending",
          },
          {
            $set: {
              status: "Rejected",
            },
          },
          {
            new: true,
            session,
          }
        );

        if (!rejectedOrder) {
          const existingOrder =
            await Order.findById(orderId).session(session);

          if (!existingOrder) {
            throw new Error("ORDER_NOT_FOUND");
          }

          if (
            existingOrder.farmer.toString() !== farmerId
          ) {
            throw new Error("NOT_ORDER_OWNER");
          }

          throw new Error("ORDER_NOT_PENDING");
        }

        const product = await Product.findById(
          rejectedOrder.product
        ).session(session);

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        // Restore the exact quantity deducted at checkout.
        product.quantityAvailable += rejectedOrder.quantity;

        if (
          product.expiryDate &&
          new Date(product.expiryDate) <= new Date()
        ) {
          product.status = "Expired";
        } else {
          product.status = "Active";
        }

        await product.save({ session });
      });

      return res.json({
        message:
          "Order rejected and stock restored successfully",
        order: rejectedOrder,
      });
    }

    // Existing status update functionality.
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.farmer.toString() !== farmerId) {
      return res.status(403).json({
        message:
          "You are not allowed to update this order",
      });
    }

    // Record completion time only when the order
    // first transitions to Completed.
    if (
      status === "Completed" &&
      order.status !== "Completed"
    ) {
      order.completedAt = new Date();
    }
if (status === "Ready") {
  const buyer = await User.findById(order.buyer).select("email");

  if (!buyer || !buyer.email) {
    return res.status(400).json({
      message: "Buyer email not found",
    });
  }

  const otp = crypto.randomInt(100000, 1000000).toString();

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({
      message: "JWT_SECRET is missing",
    });
  }

  const now = new Date();

  if (
    order.deliveryOtpLastSentAt &&
    now - new Date(order.deliveryOtpLastSentAt) < 60000
  ) {
    return res.status(429).json({
      message: "Please wait 60 seconds before resending OTP",
    });
  }

  order.status = "Ready";
  order.deliveryOtpHash = crypto
    .createHmac("sha256", secret)
    .update(otp)
    .digest("hex");

  order.deliveryOtpExpires = new Date(now.getTime() + 10 * 60 * 1000);
  order.deliveryOtpAttempts = 0;
  order.deliveryOtpLastSentAt = now;
  order.deliveryOtpVerifiedAt = null;

  await order.save();

  try {
    await sendOtpEmail({
      to: buyer.email,
      subject: "Smart Farmer Marketplace - Delivery OTP",
      heading: "Delivery Verification OTP",
      message: "Share this OTP with the farmer after receiving your order.",
      otp,
      expiresMinutes: 10,
    });
  } catch (err) {
    order.deliveryOtpHash = null;
    order.deliveryOtpExpires = null;
    order.deliveryOtpLastSentAt = null;
    await order.save();

    return res.status(502).json({
      message: "Failed to send delivery OTP email",
    });
  }

  return res.json({
    message: "Order marked Ready. Delivery OTP sent to buyer.",
    order,
  });
}

order.status = status;
await order.save();

    return res.json({
      message: `Order ${status.toLowerCase()} successfully`,
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    if (error.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (error.message === "NOT_ORDER_OWNER") {
      return res.status(403).json({
        message:
          "You are not allowed to update this order",
      });
    }

    if (error.message === "ORDER_NOT_PENDING") {
      return res.status(400).json({
        message:
          "Only pending orders can be rejected",
      });
    }

    if (error.message === "PRODUCT_NOT_FOUND") {
      return res.status(404).json({
        message:
          "The product for this order no longer exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update order status",
      error: error.message,
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// =====================================
// GET ORDERS FOR LOGGED-IN BUYER
// =====================================

const getBuyerOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      buyer: req.user.userId,
    })
      .populate(
        "product",
        "name description category image unit location"
      )
      .populate("farmer", "name email location")
      .populate("buyer", "name email location")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    console.error("Buyer orders error:", error);

    return res.status(500).json({
      message: "Failed to fetch buyer orders",
      error: error.message,
    });
  }
};// =====================================
// BUYER - REQUEST PRODUCT RETURN
// 6-HOUR RETURN WINDOW
// =====================================

const requestReturn = async (req, res) => {
  try {
    const { reason, description, evidenceImage } = req.body;
    const orderId = req.params.id;
    const buyerId = req.user.userId;

    const allowedReasons = [
      "Damaged Product",
      "Wrong Product",
      "Poor Quality",
      "Quantity Issue",
      "Other",
    ];

    // Validate order ID.
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    // Validate return reason.
    if (!allowedReasons.includes(reason)) {
      return res.status(400).json({
        message: "Please select a valid return reason",
      });
    }

    // Validate description.
    if (
      description &&
      (typeof description !== "string" ||
        description.trim().length > 1000)
    ) {
      return res.status(400).json({
        message:
          "Description must not exceed 1000 characters",
      });
    }

    // Validate evidence image payload.
    if (
      evidenceImage &&
      (typeof evidenceImage !== "string" ||
        evidenceImage.length > 4 * 1024 * 1024)
    ) {
      return res.status(400).json({
        message:
          "Evidence image must be less than 3 MB",
      });
    }

    // Find order belonging to logged-in buyer.
    const order = await Order.findOne({
      _id: orderId,
      buyer: buyerId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // Only completed orders can be returned.
    if (order.status !== "Completed") {
      return res.status(400).json({
        message:
          "Only completed orders can be returned",
      });
    }

    // Do not guess the completion time of older orders.
    if (!order.completedAt) {
      return res.status(400).json({
        message:
          "This order has no recorded delivery completion time and is not eligible for a return request.",
      });
    }

    // Calculate the 6-hour return deadline.
    const completedAt = new Date(order.completedAt);

    const returnDeadline =
      completedAt.getTime() + 6 * 60 * 60 * 1000;

    const now = Date.now();

    // Reject requests after the 6-hour deadline.
    if (now > returnDeadline) {
      return res.status(400).json({
        message:
          "The 6-hour return window has expired. Return requests are only allowed within 6 hours of delivery.",
        returnDeadline: new Date(returnDeadline),
      });
    }

    // Prevent duplicate return requests.
    if (order.returnRequest) {
      return res.status(400).json({
        message:
          "A return request already exists for this order",
      });
    }

    // Create return request.
    order.returnRequest = {
      status: "Requested",
      reason,
      description: description
        ? description.trim()
        : "",
      evidenceImage: evidenceImage || "",
      refundAmount: 0,
      refundStatus: "Not Applicable",
      refundMethod:
        order.paymentMethod === "COD"
          ? "COD"
          : "Original Payment",
      requestedAt: new Date(),
    };

    await order.save();

    return res.status(201).json({
      message:
        "Return request submitted successfully",
      order,
    });
  } catch (error) {
    console.error("Request return error:", error);

    return res.status(500).json({
      message: "Failed to submit return request",
    });
  }
  
};
// =====================================
// FARMER - REVIEW BUYER RETURN REQUEST
// =====================================

const reviewReturnRequest = async (req, res) => {
  try {
    const { decision, farmerResponse } = req.body;
    const orderId = req.params.id;
    const farmerId = req.user.userId;

    const allowedDecisions = [
      "Accepted",
      "Disputed",
      "Rejected",
    ];

    // Validate order ID.
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    // Validate decision.
    if (!allowedDecisions.includes(decision)) {
      return res.status(400).json({
        message:
          "Decision must be Accepted, Disputed, or Rejected",
      });
    }

    // Validate farmer response.
    if (
      typeof farmerResponse !== "string" ||
      !farmerResponse.trim()
    ) {
      return res.status(400).json({
        message: "Please provide a response to the buyer",
      });
    }

    if (farmerResponse.trim().length > 1000) {
      return res.status(400).json({
        message:
          "Farmer response must not exceed 1000 characters",
      });
    }

    // Find the order belonging to this farmer.
    const order = await Order.findOne({
      _id: orderId,
      farmer: farmerId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    // A return request must exist.
    if (!order.returnRequest) {
      return res.status(400).json({
        message:
          "There is no return request for this order",
      });
    }

    // Only allow a decision on a new request.
    if (order.returnRequest.status !== "Requested") {
      return res.status(400).json({
        message:
          "This return request has already been reviewed",
      });
    }

    // Save farmer's decision and response.
    order.returnRequest.status = decision;
    order.returnRequest.farmerResponse =
      farmerResponse.trim();
    order.returnRequest.reviewedAt = new Date();

    // Do not automatically refund or restore stock.
    await order.save();

    return res.json({
      message: `Return request ${decision.toLowerCase()} successfully`,
      order,
    });
  } catch (error) {
    console.error("Review return request error:", error);

    return res.status(500).json({
      message: "Failed to review return request",
    });
  }
};
/* =====================================
   FARMER - SCHEDULE RETURN PICKUP
===================================== */

/* =====================================
   FARMER - SCHEDULE OR UPDATE RETURN PICKUP
   No OTP generated during scheduling
===================================== */

const scheduleReturnPickup = async (req, res) => {
  try {
    const { pickupScheduledAt, pickupNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      farmer: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const ret = order.returnRequest;

    if (!ret || ret.status !== "Accepted") {
      return res.status(400).json({
        message:
          "Only accepted return requests can be scheduled",
      });
    }

    if (ret.pickupStatus === "Collected") {
      return res.status(400).json({
        message:
          "This product has already been collected",
      });
    }

    const pickupDate = new Date(pickupScheduledAt);

    if (
      !pickupScheduledAt ||
      Number.isNaN(pickupDate.getTime()) ||
      pickupDate <= new Date()
    ) {
      return res.status(400).json({
        message:
          "Please provide a valid future pickup date and time",
      });
    }

    if (
      pickupNotes &&
      (typeof pickupNotes !== "string" ||
        pickupNotes.trim().length > 500)
    ) {
      return res.status(400).json({
        message:
          "Pickup notes must not exceed 500 characters",
      });
    }

    const buyer = await User.findById(order.buyer)
      .select("email name");

    if (!buyer || !buyer.email) {
      return res.status(400).json({
        message: "Buyer email address not found",
      });
    }

    // Update the pickup schedule.
    ret.pickupStatus = "Scheduled";
    ret.pickupScheduledAt = pickupDate;
    ret.pickupNotes = pickupNotes
      ? pickupNotes.trim()
      : "";

    // Invalidate any previous pickup OTP when rescheduling.
    ret.pickupOtpHash = null;
    ret.pickupOtpExpires = null;
    ret.pickupOtpAttempts = 0;
    ret.pickupOtpLastSentAt = null;
    ret.pickupOtpVerifiedAt = null;

    await order.save();

    // Send the updated pickup schedule to the buyer.
    try {
      await sendOtpEmail({
        to: buyer.email,
        subject:
          "Smart Farmer Marketplace - Return Pickup Scheduled",
        heading:
          "Return Pickup Scheduled",
        message:
          `Your return pickup has been scheduled for ${pickupDate.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Kolkata",
          })} (IST). The farmer will generate a separate pickup OTP after arriving. You will receive that OTP by email at the time of pickup. Do not share any OTP before handing over the product.`,
        otp: null,
        expiresMinutes: null,
      });
    } catch (emailError) {
      console.error(
        "Pickup schedule email error:",
        emailError
      );

      return res.status(502).json({
        message:
          "Pickup time was saved, but the buyer notification email failed",
        order,
      });
    }

    return res.json({
      message:
        "Return pickup scheduled or updated successfully. Buyer notified by email. Pickup OTP will be generated only after farmer arrival.",
      order,
    });
  } catch (error) {
    console.error(
      "Schedule pickup error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to schedule return pickup",
    });
  }
};
/* =====================================
   FARMER - ARRIVE AND GENERATE PICKUP OTP
   OTP is generated only after arrival
===================================== */

const generatePickupOtp = async (req, res) => {
  try {
    const orderId = req.params.id;
    const farmerId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      farmer: farmerId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const ret = order.returnRequest;

    if (!ret || ret.status !== "Accepted") {
      return res.status(400).json({
        message:
          "Only accepted return requests can be collected",
      });
    }

    if (ret.pickupStatus !== "Scheduled") {
      return res.status(400).json({
        message:
          "Schedule the return pickup before generating OTP",
      });
    }

    if (ret.pickupOtpVerifiedAt || ret.pickupStatus === "Collected") {
      return res.status(400).json({
        message:
          "This return has already been collected",
      });
    }

    if (!ret.pickupScheduledAt) {
      return res.status(400).json({
        message:
          "Please schedule the pickup date and time first",
      });
    }

    const now = new Date();
    const scheduledAt = new Date(ret.pickupScheduledAt);

    // Farmer cannot generate OTP before scheduled time.
    if (now < scheduledAt) {
      return res.status(400).json({
        message:
          "You can generate the pickup OTP only at or after the scheduled pickup time",
        pickupScheduledAt: scheduledAt,
      });
    }

    const buyer = await User.findById(order.buyer)
      .select("email");

    if (!buyer || !buyer.email) {
      return res.status(400).json({
        message: "Buyer email address not found",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message:
          "Server OTP configuration is missing",
      });
    }

    // Prevent repeated OTP generation within 60 seconds.
    if (
      ret.pickupOtpLastSentAt &&
      now - new Date(ret.pickupOtpLastSentAt) < 60000
    ) {
      return res.status(429).json({
        message:
          "Please wait 60 seconds before generating another pickup OTP",
      });
    }

    // Do not generate another OTP while a valid one exists.
    if (
      ret.pickupOtpHash &&
      ret.pickupOtpExpires &&
      now <= new Date(ret.pickupOtpExpires)
    ) {
      return res.status(400).json({
        message:
          "A valid pickup OTP has already been sent to the buyer",
      });
    }

    const otp = crypto
      .randomInt(100000, 1000000)
      .toString();

    const otpHash = crypto
      .createHmac("sha256", secret)
      .update(otp)
      .digest("hex");

    // OTP is valid for 10 minutes from arrival.
    ret.pickupOtpHash = otpHash;

    ret.pickupOtpExpires = new Date(
      now.getTime() + 10 * 60 * 1000
    );

    ret.pickupOtpAttempts = 0;
    ret.pickupOtpLastSentAt = now;
    ret.pickupOtpVerifiedAt = null;

    await order.save();

    try {
      await sendOtpEmail({
        to: buyer.email,
        subject:
          "Smart Farmer Marketplace - Return Pickup OTP",
        heading:
          "Return Pickup Verification Code",
        message:
          "The farmer has arrived for your scheduled return pickup. Share this 6-digit OTP with the farmer only when handing over the returned product. This OTP expires in 10 minutes.",
        otp,
        expiresMinutes: 10,
      });
    } catch (emailError) {
      console.error(
        "Pickup OTP email error:",
        emailError
      );

      // Invalidate the OTP if email delivery fails.
      ret.pickupOtpHash = null;
      ret.pickupOtpExpires = null;
      ret.pickupOtpLastSentAt = null;

      await order.save();

      return res.status(502).json({
        message:
          "Failed to send pickup OTP. Please try again.",
      });
    }

    return res.json({
      message:
        "Pickup OTP generated and sent to the buyer's email. Ask the buyer for the OTP after collecting the product.",
      order,
    });
  } catch (error) {
    console.error(
      "Generate pickup OTP error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to generate pickup OTP",
    });
  }
};
/* =====================================
   FARMER - CONFIRM PRODUCT COLLECTION
===================================== */

const markReturnCollected = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    if (!/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({
        message: "Enter a valid 6-digit pickup OTP",
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      farmer: req.user.userId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const ret = order.returnRequest;

    if (!ret || ret.status !== "Accepted") {
      return res.status(400).json({
        message: "The return must be accepted before collection",
      });
    }

    if (ret.pickupStatus !== "Scheduled") {
      return res.status(400).json({
        message: "Schedule the return pickup before confirming collection",
      });
    }

    if (ret.pickupOtpVerifiedAt) {
      return res.status(400).json({
        message: "Pickup OTP has already been verified",
      });
    }

    if (!ret.pickupOtpHash || !ret.pickupOtpExpires) {
      return res.status(400).json({
        message: "Pickup OTP not found. Please schedule pickup again.",
      });
    }

    if (new Date() > new Date(ret.pickupOtpExpires)) {
      return res.status(400).json({
        message: "Pickup OTP expired. Please schedule pickup again.",
      });
    }

    if (ret.pickupOtpAttempts >= 5) {
      return res.status(429).json({
        message: "Maximum pickup OTP attempts reached",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "Server OTP configuration is missing",
      });
    }

    const submittedHash = crypto
      .createHmac("sha256", secret)
      .update(String(otp))
      .digest("hex");

    const storedHash = Buffer.from(ret.pickupOtpHash, "hex");
    const submittedBuffer = Buffer.from(submittedHash, "hex");

    ret.pickupOtpAttempts += 1;

    if (
      storedHash.length !== submittedBuffer.length ||
      !crypto.timingSafeEqual(storedHash, submittedBuffer)
    ) {
      await order.save();

      return res.status(400).json({
        message: "Incorrect pickup OTP",
        attemptsRemaining: 5 - ret.pickupOtpAttempts,
      });
    }

    ret.pickupOtpVerifiedAt = new Date();
    ret.pickupOtpHash = null;
    ret.pickupOtpExpires = null;
    ret.pickupStatus = "Collected";
    ret.collectedAt = new Date();

    await order.save();

    return res.json({
      message: "Pickup OTP verified. Product collection confirmed.",
      order,
    });
  } catch (error) {
    console.error("Confirm collection error:", error);

    return res.status(500).json({
      message: "Failed to verify pickup OTP",
    });
  }
};
/* =====================================
   FARMER - INSPECT RETURNED PRODUCT
===================================== */

const inspectReturnedProduct = async (req, res) => {
  let session;

  try {
    const { inspectionStatus, inspectionNotes } = req.body;
    const orderId = req.params.id;
    const farmerId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    if (
      !["Resellable", "Not Resellable"].includes(
        inspectionStatus
      )
    ) {
      return res.status(400).json({
        message:
          "Inspection must be Resellable or Not Resellable",
      });
    }

    if (
      typeof inspectionNotes !== "string" ||
      !inspectionNotes.trim()
    ) {
      return res.status(400).json({
        message: "Please provide inspection notes",
      });
    }

    if (inspectionNotes.trim().length > 1000) {
      return res.status(400).json({
        message: "Inspection notes must not exceed 1000 characters",
      });
    }

    session = await mongoose.startSession();

    let updatedOrder = null;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        _id: orderId,
        farmer: farmerId,
      }).session(session);

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const ret = order.returnRequest;

      if (!ret) {
        throw new Error("RETURN_NOT_FOUND");
      }

      if (ret.status !== "Accepted") {
        throw new Error("RETURN_NOT_ACCEPTED");
      }

      if (ret.pickupStatus !== "Collected") {
        throw new Error("PRODUCT_NOT_COLLECTED");
      }

      if (ret.inspectionStatus !== "Not Inspected") {
        throw new Error("ALREADY_INSPECTED");
      }

      ret.inspectionStatus = inspectionStatus;
      ret.inspectionNotes = inspectionNotes.trim();
      ret.inspectedAt = new Date();

      // Restore stock only if the product is resellable.
      // The transaction and stockRestored flag prevent
      // duplicate restoration.

      if (
        inspectionStatus === "Resellable" &&
        !ret.stockRestored
      ) {
        const product = await Product.findById(
          order.product
        ).session(session);

        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        product.quantityAvailable += order.quantity;

        if (
          product.expiryDate &&
          new Date(product.expiryDate) <= new Date()
        ) {
          product.status = "Expired";
        } else if (product.quantityAvailable > 0) {
          product.status = "Active";
        }

        await product.save({ session });

        ret.stockRestored = true;
        ret.stockRestoredAt = new Date();
      }

      // Return is received after inspection.
      ret.status = "Received";

      // Refund is not completed automatically.
      ret.refundStatus = "Pending";
      ret.refundAmount = order.totalAmount;

      await order.save({ session });

      updatedOrder = order;
    });

    return res.json({
      message:
        "Inspection completed. Return received and refund is pending.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Inspect return error:", error);

    const errors = {
      ORDER_NOT_FOUND: [404, "Order not found"],
      RETURN_NOT_FOUND: [400, "Return request not found"],
      RETURN_NOT_ACCEPTED: [400, "Return must be accepted first"],
      PRODUCT_NOT_COLLECTED: [400, "Confirm collection before inspection"],
      ALREADY_INSPECTED: [400, "Product has already been inspected"],
      PRODUCT_NOT_FOUND: [404, "Product not found"],
    };

    if (errors[error.message]) {
      const [statusCode, message] = errors[error.message];

      return res.status(statusCode).json({ message });
    }

    return res.status(500).json({
      message: "Failed to inspect returned product",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};


/* =====================================
   ADMIN - RESOLVE RETURN DISPUTE
===================================== */

const resolveReturnDispute = async (req, res) => {
  try {
    const { resolution, adminNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    if (
      !["Buyer Approved", "Farmer Approved"].includes(
        resolution
      )
    ) {
      return res.status(400).json({
        message:
          "Resolution must be Buyer Approved or Farmer Approved",
      });
    }

    if (
      typeof adminNotes !== "string" ||
      !adminNotes.trim() ||
      adminNotes.trim().length > 1000
    ) {
      return res.status(400).json({
        message: "Please provide admin resolution notes",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const ret = order.returnRequest;

    if (!ret || ret.status !== "Disputed") {
      return res.status(400).json({
        message: "This return is not under dispute",
      });
    }

    if (ret.adminResolution !== "Pending") {
      return res.status(400).json({
        message: "This dispute has already been resolved",
      });
    }

    ret.adminResolution = resolution;
    ret.adminNotes = adminNotes.trim();
    ret.resolvedAt = new Date();

    if (resolution === "Buyer Approved") {
      ret.status = "Accepted";
      ret.farmerResponse =
        "The admin has approved the buyer's return request.";
    } else {
      ret.status = "Rejected";
      ret.farmerResponse =
        "The admin has ruled in favor of the farmer.";
    }

    ret.reviewedAt = new Date();

    await order.save();

    return res.json({
      message: "Return dispute resolved successfully",
      order,
    });
  } catch (error) {
    console.error("Resolve dispute error:", error);

    return res.status(500).json({
      message: "Failed to resolve return dispute",
    });
  }
};


/* =====================================
   FARMER - UPDATE REFUND STATUS
===================================== */

const updateRefundStatus = async (req, res) => {
  try {
    const {
      refundStatus,
      refundAmount,
      refundReference,
      refundNotes,
    } = req.body;

    const orderId = req.params.id;
    const farmerId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID",
      });
    }

    const allowedStatuses = [
      "Processing",
      "Completed",
      "Failed",
    ];

    if (!allowedStatuses.includes(refundStatus)) {
      return res.status(400).json({
        message:
          "Refund status must be Processing, Completed, or Failed",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      farmer: farmerId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const ret = order.returnRequest;

    if (!ret || ret.status !== "Received") {
      return res.status(400).json({
        message:
          "The returned product must be received and inspected first",
      });
    }

    if (ret.refundStatus === "Completed") {
      return res.status(400).json({
        message: "This refund has already been completed",
      });
    }

    if (
      refundNotes &&
      (typeof refundNotes !== "string" ||
        refundNotes.trim().length > 500)
    ) {
      return res.status(400).json({
        message: "Refund notes must not exceed 500 characters",
      });
    }

    if (
      refundReference &&
      (typeof refundReference !== "string" ||
        refundReference.trim().length > 200)
    ) {
      return res.status(400).json({
        message: "Refund reference must not exceed 200 characters",
      });
    }

    if (refundStatus === "Completed") {
      const amount = Number(refundAmount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > order.totalAmount
      ) {
        return res.status(400).json({
          message:
            "Enter a valid refund amount not exceeding the order total",
        });
      }

      if (
        typeof refundReference !== "string" ||
        !refundReference.trim()
      ) {
        return res.status(400).json({
          message:
            "Provide a payment reference or manual refund receipt before completing the refund",
        });
      }

      // This records the farmer's confirmation.
      // It does not transfer money or verify a bank payment.
      ret.refundAmount = amount;
      ret.refundReference = refundReference.trim();
      ret.refundedAt = new Date();
      ret.status = "Refunded";
    }

    if (refundStatus === "Processing") {
      ret.refundInitiatedAt = new Date();
    }

    ret.refundStatus = refundStatus;

    ret.refundNotes = refundNotes
      ? refundNotes.trim()
      : "";

    await order.save();

    return res.json({
      message:
        refundStatus === "Completed"
          ? "Refund marked as completed. Ensure payment has actually been made."
          : `Refund marked as ${refundStatus.toLowerCase()}`,
      order,
    });
  } catch (error) {
    console.error("Update refund error:", error);

    return res.status(500).json({
      message: "Failed to update refund status",
    });
  }
};
const verifyDeliveryOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const orderId = req.params.id;
    const farmerId = req.user.userId;

    if (!/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({
        message: "Enter a valid 6-digit OTP",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      farmer: farmerId,
    });

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.status !== "Ready") {
      return res.status(400).json({
        message: "Order must be Ready before delivery verification",
      });
    }

    if (order.deliveryOtpVerifiedAt) {
      return res.status(400).json({
        message: "Delivery OTP already verified",
      });
    }

    if (!order.deliveryOtpHash || !order.deliveryOtpExpires) {
      return res.status(400).json({
        message: "Please generate a delivery OTP first",
      });
    }

    if (new Date() > new Date(order.deliveryOtpExpires)) {
      return res.status(400).json({
        message: "Delivery OTP expired. Please generate a new OTP",
      });
    }

    if (order.deliveryOtpAttempts >= 5) {
      return res.status(429).json({
        message: "Maximum OTP attempts reached",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "Server OTP configuration is missing",
      });
    }

    const submittedHash = crypto
      .createHmac("sha256", secret)
      .update(String(otp))
      .digest("hex");

    const storedHash = Buffer.from(order.deliveryOtpHash, "hex");
    const submittedBuffer = Buffer.from(submittedHash, "hex");

    order.deliveryOtpAttempts += 1;

    if (
      storedHash.length !== submittedBuffer.length ||
      !crypto.timingSafeEqual(storedHash, submittedBuffer)
    ) {
      await order.save();

      return res.status(400).json({
        message: "Incorrect delivery OTP",
        attemptsRemaining: 5 - order.deliveryOtpAttempts,
      });
    }

    const now = new Date();

    order.deliveryOtpVerifiedAt = now;
    order.deliveryOtpHash = null;
    order.deliveryOtpExpires = null;
    order.status = "Completed";
    order.completedAt = now;

    await order.save();

    return res.json({
      message: "Delivery verified. Order completed successfully.",
      order,
    });
  } catch (error) {
    console.error("Delivery OTP verification error:", error);

    return res.status(500).json({
      message: "Failed to verify delivery OTP",
    });
  }
};
// =========================
// GET FARMER ORDERS
// =========================

const getFarmerOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      farmer: req.user.userId,
    })
      .populate("product", "name description category image unit")
      .populate("buyer", "name email location")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (error) {
    console.error("Get farmer orders error:", error);

    return res.status(500).json({
      message: "Failed to fetch farmer orders",
      error: error.message,
    });
  }
};
// =====================================
// EXPORT CONTROLLERS
// =====================================

module.exports = {
  createOrder,

  checkoutCart,
  getFarmerOrders,
  updateOrderStatus,
  verifyDeliveryOtp,
  generatePickupOtp,
  getBuyerOrders,
  requestReturn,
  reviewReturnRequest,
  scheduleReturnPickup,
  markReturnCollected,
  inspectReturnedProduct,
  resolveReturnDispute,
  updateRefundStatus,
};