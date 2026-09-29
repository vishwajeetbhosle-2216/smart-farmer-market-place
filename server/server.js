const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load environment variables first
dotenv.config();

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const testRoutes = require("./routes/testRoutes");
const orderRoutes = require("./routes/orderRoutes");
const adminRoutes = require("./routes/adminRoutes");
const priceAssistantRoutes = require("./routes/priceAssistantRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());

app.use(
  express.json({
    limit: "5mb",
  })
);

// API Routes
app.use("/api/auth", authRoutes);

app.use("/api/products", productRoutes);

app.use("/api/test", testRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use(
  "/api/price-assistant",
  priceAssistantRoutes
);

// Home route
app.get("/", (req, res) => {
  res.send(
    "Smart Farmer Marketplace API is running"
  );
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});