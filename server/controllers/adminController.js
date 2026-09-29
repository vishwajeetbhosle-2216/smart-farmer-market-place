const User = require("../models/user");
const Product = require("../models/product");
const Order = require("../models/order");

// ==========================================
// GET ALL USERS
// ==========================================

const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const users = await User.find().select("-password");

    res.status(200).json(users);
  } catch (error) {
    console.error("Get all users error:", error);

    res.status(500).json({
      message: "Failed to fetch users",
    });
  }
};

// ==========================================
// GET ALL PRODUCTS
// ==========================================

const getAllProducts = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const products = await Product.find()
      .populate("farmer", "name email");

    res.status(200).json(products);
  } catch (error) {
    console.error("Get all products error:", error);

    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
};

// ==========================================
// GET ALL ORDERS
// ==========================================

const getAllOrders = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const orders = await Order.find()
      // FIX: Include product image and details
      .populate(
        "product",
        "name image category unit"
      )
      .populate("buyer", "name email")
      .populate("farmer", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("Get all orders error:", error);

    res.status(500).json({
      message: "Failed to fetch orders",
    });
  }
};

// ==========================================
// BLOCK / UNBLOCK USER
// ==========================================

const toggleUserStatus = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin accounts cannot be blocked.",
      });
    }

    user.isActive = !user.isActive;

    await user.save();

    res.status(200).json({
      message: user.isActive
        ? "User activated successfully."
        : "User blocked successfully.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error(
      "Toggle user status error:",
      error
    );

    res.status(500).json({
      message: "Failed to update user status.",
    });
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  getAllUsers,
  getAllProducts,
  getAllOrders,
  toggleUserStatus,
};