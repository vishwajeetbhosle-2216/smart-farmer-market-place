import { useEffect, useMemo, useState } from "react";
import "./FarmerEarnings.css";

function FarmerEarnings() {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("Loading earnings...");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchEarnings = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(
          "https://smart-farmer-api-g7q.onrender.com/api/orders/farmer-orders",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.message || "Failed to load earnings.");
          return;
        }

        setOrders(data);
        setMessage("");
      } catch (error) {
        console.error("Farmer earnings error:", error);
        setMessage("Unable to connect to the server.");
      }
    };

    fetchEarnings();
  }, []);

  // Only completed orders count as earnings
  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  );

  // Check whether an order belongs to the selected period
  const isInSelectedPeriod = (order) => {
    if (filter === "all") {
      return true;
    }

    if (!order.createdAt) {
      return false;
    }

    const orderDate = new Date(order.createdAt);
    const now = new Date();

    if (filter === "today") {
      return (
        orderDate.getDate() === now.getDate() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }

    if (filter === "month") {
      return (
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getFullYear() === now.getFullYear()
      );
    }

    return true;
  };

  // Orders after applying date filter
  const filteredOrders = completedOrders.filter(
    isInSelectedPeriod
  );

  // Total earnings
  const totalEarnings = filteredOrders.reduce(
    (total, order) =>
      total + Number(order.totalAmount || 0),
    0
  );

  // Total quantity sold
  const totalQuantitySold = filteredOrders.reduce(
    (total, order) =>
      total + Number(order.quantity || 0),
    0
  );

  // Format date
  const formatDate = (date) => {
    if (!date) {
      return "Date unavailable";
    }

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Format date with time
  const formatDateTime = (date) => {
    if (!date) {
      return "Date unavailable";
    }

    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Product-wise earnings
  const productBreakdown = useMemo(() => {
    const breakdown = {};

    filteredOrders.forEach((order) => {
      const productName =
        order.product?.name || "Unknown Product";

      if (!breakdown[productName]) {
        breakdown[productName] = {
          name: productName,
          quantity: 0,
          earnings: 0,
          orders: 0,
        };
      }

      breakdown[productName].quantity += Number(
        order.quantity || 0
      );

      breakdown[productName].earnings += Number(
        order.totalAmount || 0
      );

      breakdown[productName].orders += 1;
    });

    return Object.values(breakdown).sort(
      (a, b) => b.earnings - a.earnings
    );
  }, [filteredOrders]);

  // Filter title
  const getFilterTitle = () => {
    if (filter === "today") {
      return "Today's Sales";
    }

    if (filter === "month") {
      return "This Month's Sales";
    }

    return "All Completed Sales";
  };

  return (
    <div className="farmer-earnings-page">

      {/* Header */}
      <div className="earnings-header">
        <div>
          <span className="earnings-badge">
            💰 Farmer Earnings
          </span>

          <h1>My Earnings</h1>

          <p>
            Track your completed sales and total earnings
            from the marketplace.
          </p>
        </div>

        <div className="earnings-header-icon">
          💰
        </div>
      </div>

      {/* Date Filters */}
      <div className="earnings-filters">

        <button
          className={
            filter === "all"
              ? "earnings-filter active"
              : "earnings-filter"
          }
          onClick={() => setFilter("all")}
        >
          📊 All Time
        </button>

        <button
          className={
            filter === "month"
              ? "earnings-filter active"
              : "earnings-filter"
          }
          onClick={() => setFilter("month")}
        >
          📅 This Month
        </button>

        <button
          className={
            filter === "today"
              ? "earnings-filter active"
              : "earnings-filter"
          }
          onClick={() => setFilter("today")}
        >
          🗓️ Today
        </button>

      </div>

      {/* Summary Cards */}
      <div className="earnings-summary">

        <div className="earning-card">
          <div className="earning-icon">
            💰
          </div>

          <div>
            <p>Total Earnings</p>

            <h2>
              ₹{totalEarnings.toLocaleString("en-IN")}
            </h2>
          </div>
        </div>

        <div className="earning-card">
          <div className="earning-icon">
            📦
          </div>

          <div>
            <p>Products Sold</p>

            <h2>
              {totalQuantitySold} kg
            </h2>
          </div>
        </div>

        <div className="earning-card">
          <div className="earning-icon">
            ✅
          </div>

          <div>
            <p>Completed Orders</p>

            <h2>
              {filteredOrders.length}
            </h2>
          </div>
        </div>

      </div>

      {/* Product-wise Earnings */}
      {filteredOrders.length > 0 && (
        <div className="product-earnings-section">

          <div className="sales-section-header">

            <div>
              <span>PRODUCT PERFORMANCE</span>

              <h2>Earnings by Product</h2>

              <p>
                See which products are generating the most
                earnings.
              </p>
            </div>

          </div>

          <div className="product-earnings-list">

            {productBreakdown.map((product) => (
              <div
                className="product-earning-card"
                key={product.name}
              >

                <div className="product-earning-info">

                  <div className="sale-product-icon">
                    🌱
                  </div>

                  <div>
                    <h3>{product.name}</h3>

                    <p>
                      {product.orders} completed{" "}
                      {product.orders === 1
                        ? "order"
                        : "orders"}
                    </p>
                  </div>

                </div>

                <div className="product-earning-detail">

                  <span>QUANTITY SOLD</span>

                  <strong>
                    {product.quantity} kg
                  </strong>

                </div>

                <div className="product-earning-detail">

                  <span>EARNINGS</span>

                  <strong className="sale-amount">
                    ₹
                    {product.earnings.toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                </div>

              </div>
            ))}

          </div>

        </div>
      )}

      {/* Sales History */}
      <div className="sales-section">

        <div className="sales-section-header">

          <div>
            <span>SALES HISTORY</span>

            <h2>{getFilterTitle()}</h2>

            <p>
              Your successfully completed marketplace
              orders.
            </p>
          </div>

          <div className="sales-count">
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1
              ? "Sale"
              : "Sales"}
          </div>

        </div>

        {/* Message */}
        {message && (
          <div className="earnings-message">
            {message}
          </div>
        )}

        {/* No completed sales */}
        {!message &&
          filteredOrders.length === 0 && (
            <div className="no-earnings">

              <div className="no-earnings-icon">
                🌱
              </div>

              <h3>
                No sales found
              </h3>

              <p>
                There are no completed sales for the
                selected period.
              </p>

            </div>
          )}

        {/* Completed Sales */}
        {filteredOrders.length > 0 && (
          <div className="sales-list">

            {filteredOrders.map((order) => (
              <div
                className="sale-card"
                key={order._id}
              >

                {/* Product */}
                <div className="sale-product">

                  <div className="sale-product-icon">
                    🌱
                  </div>

                  <div>
                    <span>PRODUCT</span>

                    <h3>
                      {order.product?.name ||
                        "Product"}
                    </h3>

                    <p>
                      Buyer:{" "}
                      {order.buyer?.name ||
                        "Unknown"}
                    </p>

                  </div>

                </div>

                {/* Quantity */}
                <div className="sale-detail">

                  <span>QUANTITY</span>

                  <strong>
                    {order.quantity} kg
                  </strong>

                </div>

                {/* Price */}
                <div className="sale-detail">

                  <span>PRICE</span>

                  <strong>
                    ₹{order.pricePerKg} / kg
                  </strong>

                </div>

                {/* Amount */}
                <div className="sale-detail">

                  <span>AMOUNT EARNED</span>

                  <strong className="sale-amount">
                    ₹
                    {Number(
                      order.totalAmount || 0
                    ).toLocaleString("en-IN")}
                  </strong>

                </div>

                {/* Date */}
                <div className="sale-detail">

                  <span>SALE DATE</span>

                  <strong>
                    {formatDate(order.createdAt)}
                  </strong>

                  <small>
                    {formatDateTime(
                      order.createdAt
                    )}
                  </small>

                </div>

                {/* Status */}
                <div className="sale-status">

                  <span>
                    ✓ Completed
                  </span>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}

export default FarmerEarnings;