import { useEffect, useState } from "react";
import "./MyOrders.css";

const API_URL = "https://smart-farmer-api-g7q.onrender.com/api/orders";
const RETURN_WINDOW_MS = 6 * 60 * 60 * 1000;

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("Loading orders...");

  const [returnForms, setReturnForms] = useState({});
  const [returnMessages, setReturnMessages] = useState({});
  const [submittingOrderId, setSubmittingOrderId] = useState(null);

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    fetchBuyerOrders();

    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================
  // FETCH BUYER ORDERS
  // =========================

  const fetchBuyerOrders = async () => {
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${API_URL}/buyer-orders`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to load orders");
        return;
      }

      setOrders(data);
      setMessage(data.length === 0 ? "You have no orders yet." : "");
    } catch (error) {
      console.error("Buyer orders error:", error);
      setMessage("Unable to connect to the server");
    }
  };

  // =========================
  // ORDER STATUS CLASS
  // =========================

  const getStatusClass = (status) => {
    switch (status) {
      case "Pending":
        return "status-pending";
      case "Accepted":
        return "status-accepted";
      case "Preparing":
        return "status-preparing";
      case "Ready":
        return "status-ready";
      case "Completed":
        return "status-completed";
      case "Rejected":
        return "status-rejected";
      default:
        return "status-default";
    }
  };

  // =========================
  // FORMAT DATE AND TIME
  // =========================

  const formatDate = (date) => {
    if (!date) return "Date not available";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================
  // INVOICE HELPERS
  // =========================

  const escapeHTML = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Coordinates are stored as [longitude, latitude].
  const formatLocation = (coordinates) => {
    if (
      !Array.isArray(coordinates) ||
      coordinates.length < 2
    ) {
      return "Location not available";
    }

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      (longitude === 0 && latitude === 0)
    ) {
      return "Location not available";
    }

    return `Latitude: ${latitude}, Longitude: ${longitude}`;
  };

  // =========================
  // PRINT / SAVE INVOICE
  // =========================
const handlePrintInvoice = (order) => {
  const invoice = order.invoiceSnapshot || {};

  const invoiceNumber =
    invoice.invoiceNumber ||
    `SFM-${order._id.slice(-8).toUpperCase()}`;

  // --------------------------------------------------
  // BUYER DETAILS
  // --------------------------------------------------
  const buyerName =
    invoice.buyerName ||
    order.buyer?.name ||
    "Buyer";

  const buyerEmail =
    invoice.buyerEmail ||
    order.buyer?.email ||
    "";

  // --------------------------------------------------
  // FARMER DETAILS
  // --------------------------------------------------
  const farmerName =
    invoice.farmerName ||
    order.farmer?.name ||
    "Farmer";

  // --------------------------------------------------
  // PRODUCT DETAILS
  // --------------------------------------------------
  const productName =
    invoice.productName ||
    order.product?.name ||
    "Product";

  const unit =
    invoice.productUnit ||
    order.product?.unit ||
    "kg";

  // --------------------------------------------------
  // GET VALID COORDINATES
  // Coordinates stored as [longitude, latitude]
  // --------------------------------------------------
  const getCoordinates = (...values) => {
    for (const value of values) {
      if (
        Array.isArray(value) &&
        value.length >= 2 &&
        Number.isFinite(Number(value[0])) &&
        Number.isFinite(Number(value[1])) &&
        !(Number(value[0]) === 0 && Number(value[1]) === 0)
      ) {
        return value;
      }
    }

    return [];
  };

  // --------------------------------------------------
  // BUYER COORDINATES
  // --------------------------------------------------
  const buyerCoordinates = getCoordinates(
    invoice.buyerLocation,
    order.buyer?.location?.coordinates
  );

  // --------------------------------------------------
  // FARMER COORDINATES
  // --------------------------------------------------
  const farmerCoordinates = getCoordinates(
    invoice.farmerLocation,
    order.product?.location?.coordinates,
    order.farmer?.location?.coordinates
  );

  // --------------------------------------------------
  // READABLE BUYER LOCATION
  // --------------------------------------------------
  const buyerLocationName =
    invoice.buyerLocationName ||
    order.buyer?.locationName ||
    invoice.buyerAddress ||
    "";

  // --------------------------------------------------
  // READABLE FARMER LOCATION
  // --------------------------------------------------
  const farmerLocationName =
    invoice.farmerLocationName ||
    order.farmer?.locationName ||
    order.product?.farmerLocation ||
    "";

  // --------------------------------------------------
  // FORMAT COORDINATES
  // --------------------------------------------------
  const buyerCoordinatesText =
    formatLocation(buyerCoordinates);

  const farmerCoordinatesText =
    formatLocation(farmerCoordinates);

  // --------------------------------------------------
  // CREATE SAFE LOCATION HTML
  // --------------------------------------------------
  const buyerLocationHTML = [
    buyerLocationName
      ? escapeHTML(buyerLocationName)
      : "",
    buyerCoordinatesText
      ? escapeHTML(buyerCoordinatesText)
      : "",
  ]
    .filter(Boolean)
    .join("<br>");

  const farmerLocationHTML = [
    farmerLocationName
      ? escapeHTML(farmerLocationName)
      : "",
    farmerCoordinatesText
      ? escapeHTML(farmerCoordinatesText)
      : "",
  ]
    .filter(Boolean)
    .join("<br>");

  // --------------------------------------------------
  // ORDER INFORMATION
  // --------------------------------------------------
  const orderDate = formatDateTime(
    invoice.generatedAt || order.createdAt
  );

  const quantity = Number(order.quantity || 0);
  const price = Number(order.pricePerKg || 0);
  const total = Number(order.totalAmount || 0);

  // --------------------------------------------------
  // OPEN PRINT WINDOW
  // --------------------------------------------------
  const printWindow = window.open(
    "",
    "_blank",
    "width=900,height=900"
  );

  if (!printWindow) {
    alert(
      "Please allow pop-ups for this website to view or print your invoice."
    );
    return;
  }

  // --------------------------------------------------
  // INVOICE HTML
  // --------------------------------------------------
  const invoiceHTML = `
    <!DOCTYPE html>
    <html lang="en">

    <head>
      <meta charset="UTF-8">

      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
      >

      <title>Invoice ${escapeHTML(invoiceNumber)}</title>

      <style>
        * {
          box-sizing: border-box;
        }

        body {
          font-family: Arial, sans-serif;
          color: #172b1c;
          margin: 0;
          padding: 30px;
          background: #ffffff;
        }

        .invoice {
          max-width: 800px;
          margin: auto;
          border: 1px solid #dce5dc;
          padding: 32px;
          background: white;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          border-bottom: 3px solid #237a3b;
          padding-bottom: 22px;
        }

        h1 {
          margin: 0;
          color: #237a3b;
          font-size: 30px;
          letter-spacing: 1px;
        }

        .subtitle {
          margin-top: 8px;
          font-size: 17px;
          font-weight: bold;
          color: #263d2c;
        }

        .tagline {
          margin-top: 8px;
          color: #45564a;
          font-size: 13px;
        }

        .invoice-number {
          text-align: right;
          font-size: 13px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .section {
          margin-top: 28px;
        }

        h2 {
          font-size: 17px;
          color: #237a3b;
          margin: 0 0 14px;
        }

        .parties {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .party {
          background: #f4f8f4;
          border: 1px solid #e0e9e0;
          padding: 18px;
          border-radius: 8px;
          overflow-wrap: anywhere;
        }

        .party p {
          font-size: 14px;
          line-height: 1.7;
          margin: 7px 0;
          color: #263d2c;
        }

        .location {
          display: block;
          margin-top: 5px;
          line-height: 1.8;
          overflow-wrap: anywhere;
          color: #263d2c;
        }

        .location-label {
          font-weight: bold;
          color: #172b1c;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }

        th,
        td {
          border: 1px solid #dce5dc;
          padding: 13px 10px;
          text-align: left;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        th {
          background: #edf5ee;
          color: #1e492a;
        }

        .amount {
          text-align: right;
          white-space: nowrap;
        }

        .total-row {
          font-weight: bold;
          font-size: 16px;
          background: #f4f8f4;
        }

        .payment {
          margin-top: 24px;
          padding: 18px;
          background: #f4f8f4;
          border: 1px solid #e0e9e0;
          border-radius: 8px;
          line-height: 1.9;
          font-size: 14px;
        }

        .footer {
          border-top: 1px solid #dce5dc;
          margin-top: 35px;
          padding-top: 18px;
          text-align: center;
          color: #45564a;
          font-size: 12px;
          line-height: 1.8;
        }

        .print-button {
          display: block;
          margin: 25px auto;
          padding: 13px 26px;
          border: none;
          border-radius: 7px;
          background: #237a3b;
          color: white;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
        }

        .print-button:hover {
          background: #185b2b;
        }

        @page {
          size: A4;
          margin: 15mm;
        }

        @media print {
          body {
            padding: 0;
            background: white;
          }

          .invoice {
            border: none;
            padding: 0;
            max-width: 100%;
          }

          .print-button {
            display: none !important;
          }

          .party,
          .payment,
          th,
          .total-row {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }

        @media (max-width: 600px) {
          body {
            padding: 10px;
          }

          .invoice {
            padding: 15px;
          }

          .parties {
            grid-template-columns: 1fr;
          }

          .header {
            flex-direction: column;
          }

          .invoice-number {
            text-align: left;
          }

          th,
          td {
            padding: 8px 5px;
            font-size: 11px;
          }
        }
      </style>
    </head>

    <body>

      <div class="invoice">

        <!-- HEADER -->
        <div class="header">

          <div>
            <h1>INVOICE</h1>

            <div class="subtitle">
              Smart Farmer Marketplace
            </div>

            <div class="tagline">
              Connecting Farmers Directly With Buyers
            </div>
          </div>

          <div class="invoice-number">

            <strong>Invoice Number</strong><br>
            ${escapeHTML(invoiceNumber)}<br>

            <strong>Order ID</strong><br>
            ${escapeHTML(order._id)}<br>

            <strong>Order Date</strong><br>
            ${escapeHTML(orderDate)}

          </div>

        </div>

        <!-- BUYER AND FARMER DETAILS -->
        <div class="section parties">

          <!-- BUYER -->
          <div class="party">

            <h2>Buyer Details</h2>

            <p>
              <strong>Name:</strong>
              ${escapeHTML(buyerName)}
            </p>

            ${
              buyerEmail
                ? `
                  <p>
                    <strong>Email:</strong>
                    ${escapeHTML(buyerEmail)}
                  </p>
                `
                : ""
            }

            <p>
              <strong>Location:</strong>

              <span class="location">
                ${
                  buyerLocationHTML ||
                  "Location not available"
                }
              </span>
            </p>

          </div>

          <!-- FARMER -->
          <div class="party">

            <h2>Farmer Details</h2>

            <p>
              <strong>Name:</strong>
              ${escapeHTML(farmerName)}
            </p>

            <p>
              <strong>Location:</strong>

              <span class="location">
                ${
                  farmerLocationHTML ||
                  "Location not available"
                }
              </span>
            </p>

          </div>

        </div>

        <!-- ORDER DETAILS -->
        <div class="section">

          <h2>Order Details</h2>

          <table>

            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price / Unit</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>

            <tbody>

              <tr>
                <td>
                  ${escapeHTML(productName)}
                </td>

                <td>
                  ${escapeHTML(quantity)} ${escapeHTML(unit)}
                </td>

                <td>
                  ₹${price.toFixed(2)}
                  / ${escapeHTML(unit)}
                </td>

                <td class="amount">
                  ₹${total.toFixed(2)}
                </td>
              </tr>

              <tr class="total-row">

                <td colspan="3">
                  Total Amount
                </td>

                <td class="amount">
                  ₹${total.toFixed(2)}
                </td>

              </tr>

            </tbody>

          </table>

        </div>

        <!-- PAYMENT DETAILS -->
        <div class="payment">

          <strong>Payment Method:</strong>
          ${escapeHTML(order.paymentMethod || "COD")}
          <br>

          <strong>Payment Status:</strong>
          ${escapeHTML(order.paymentStatus || "Pending")}
          <br>

          <strong>Order Status:</strong>
          ${escapeHTML(order.status || "Pending")}

        </div>

        <!-- FOOTER -->
        <div class="footer">

          Thank you for using Smart Farmer Marketplace!<br>

          Supporting farmers and connecting them directly with buyers.

        </div>

      </div>

      <button
        class="print-button"
        onclick="window.print()"
      >
        Print / Save as PDF
      </button>

    </body>

    </html>
  `;

  // --------------------------------------------------
  // DISPLAY INVOICE
  // --------------------------------------------------
  printWindow.document.open();
  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
  printWindow.focus();
};
  // RETURN DEADLINE
  // =========================

  const getReturnDeadline = (order) => {
    if (!order.completedAt) return null;

    const completedTime = new Date(order.completedAt).getTime();

    if (Number.isNaN(completedTime)) return null;

    return completedTime + RETURN_WINDOW_MS;
  };

  const isReturnEligible = (order) => {
    const deadline = getReturnDeadline(order);

    return (
      order.status === "Completed" &&
      !order.returnRequest &&
      deadline !== null &&
      currentTime <= deadline
    );
  };

  const getRemainingTime = (order) => {
    const deadline = getReturnDeadline(order);

    if (!deadline) return null;

    const remaining = deadline - currentTime;

    if (remaining <= 0) {
      return "Return window expired";
    }

    const totalMinutes = Math.floor(remaining / (1000 * 60));

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m remaining`;
  };

  // =========================
  // UPDATE RETURN FORM
  // =========================

  const updateReturnForm = (orderId, field, value) => {
    setReturnForms((previous) => ({
      ...previous,
      [orderId]: {
        ...previous[orderId],
        [field]: value,
      },
    }));
  };

  // =========================
  // SUBMIT RETURN REQUEST
  // =========================

  const handleReturnSubmit = async (orderId) => {
    const order = orders.find((item) => item._id === orderId);

    if (!order || !isReturnEligible(order)) {
      setReturnMessages((previous) => ({
        ...previous,
        [orderId]: {
          type: "error",
          text:
            "The 6-hour return window has expired or this order is not eligible.",
        },
      }));

      return;
    }

    const form = returnForms[orderId] || {};

    if (!form.reason) {
      setReturnMessages((previous) => ({
        ...previous,
        [orderId]: {
          type: "error",
          text: "Please select a return reason.",
        },
      }));

      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to submit this return request?"
    );

    if (!confirmed) return;

    const token = localStorage.getItem("token");

    setSubmittingOrderId(orderId);

    setReturnMessages((previous) => ({
      ...previous,
      [orderId]: null,
    }));

    try {
      const response = await fetch(`${API_URL}/${orderId}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: form.reason,
          description: form.description || "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setReturnMessages((previous) => ({
          ...previous,
          [orderId]: {
            type: "error",
            text: data.message || "Failed to submit return request.",
          },
        }));

        return;
      }

      setOrders((previous) =>
        previous.map((item) =>
          item._id === orderId
            ? {
                ...item,
                returnRequest: data.order?.returnRequest || {
                  status: "Requested",
                  reason: form.reason,
                  description: form.description || "",
                  requestedAt: new Date().toISOString(),
                  refundStatus: "Not Applicable",
                },
              }
            : item
        )
      );

      setReturnMessages((previous) => ({
        ...previous,
        [orderId]: {
          type: "success",
          text: data.message || "Return request submitted successfully.",
        },
      }));

      setReturnForms((previous) => ({
        ...previous,
        [orderId]: {
          reason: "",
          description: "",
        },
      }));
    } catch (error) {
      console.error("Return request error:", error);

      setReturnMessages((previous) => ({
        ...previous,
        [orderId]: {
          type: "error",
          text: "Unable to connect to the server.",
        },
      }));
    } finally {
      setSubmittingOrderId(null);
    }
  };

  // =========================
  // RETURN STATUS CLASS
  // =========================

  const getReturnStatusClass = (status) => {
    switch (status) {
      case "Requested":
        return "return-status-requested";
      case "Accepted":
        return "return-status-accepted";
      case "Disputed":
        return "return-status-disputed";
      case "Rejected":
        return "return-status-rejected";
      case "Received":
        return "return-status-received";
      case "Refunded":
        return "return-status-refunded";
      default:
        return "status-default";
    }
  };

  // =========================
  // BUYER PANEL
  // =========================

  return (
    <div className="buyer-orders-page">
      <div className="buyer-orders-header">
        <div>
          <div className="buyer-orders-badge">
            🛒 Buyer Panel
          </div>

          <h1>My Orders</h1>

          <p>
            Track and manage all your marketplace orders from one place.
          </p>
        </div>

        <div className="buyer-orders-icon">📦</div>
      </div>

      {orders.length > 0 && (
        <div className="orders-summary">
          <div className="summary-icon">📦</div>

          <div>
            <strong>{orders.length}</strong>

            <span>
              {orders.length === 1
                ? " Order Placed"
                : " Orders Placed"}
            </span>
          </div>
        </div>
      )}

      {message && orders.length === 0 && (
        <div className="orders-empty">
          <div className="empty-orders-icon">📦</div>

          <h2>No Orders Yet</h2>

          <p>{message}</p>

          <a
            href="/marketplace"
            className="browse-marketplace-button"
          >
            Browse Marketplace →
          </a>
        </div>
      )}

      {orders.length > 0 && (
        <div className="buyer-orders-list">
          {orders.map((order) => {
            const returnRequest = order.returnRequest;
            const returnForm = returnForms[order._id] || {};
            const returnMessage = returnMessages[order._id];

            const returnDeadline = getReturnDeadline(order);
            const returnEligible = isReturnEligible(order);
            const remainingTime = getRemainingTime(order);

            return (
              <div
                className="buyer-order-card"
                key={order._id}
              >
                {/* PRODUCT IMAGE */}

                <div className="buyer-order-image">
                  {order.product?.image ? (
                    <img
                      src={order.product.image}
                      alt={order.product?.name || "Product"}
                    />
                  ) : (
                    <div className="order-no-image">
                      🌱
                    </div>
                  )}
                </div>

                <div className="buyer-order-content">
                  {/* ORDER HEADER */}

                  <div className="order-top-row">
                    <div>
                      <span className="order-number">
                        Order #{order._id?.slice(-6)}
                      </span>

                      <h2>
                        {order.product?.name || "Product"}
                      </h2>
                    </div>

                    <span
                      className={`order-status ${getStatusClass(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* FARMER */}

                  <div className="order-farmer">
                    <span className="farmer-icon">
                      👨‍🌾
                    </span>

                    <div>
                      <small>Farmer</small>

                      <strong>
                        {order.farmer?.name || "Unknown Farmer"}
                      </strong>
                    </div>
                  </div>

                  {/* ORDER DETAILS */}

                  <div className="order-details-grid">
                    <div className="order-detail-box">
                      <span>Quantity</span>

                      <strong>
                        {order.quantity} kg
                      </strong>
                    </div>

                    <div className="order-detail-box">
                      <span>Price</span>

                      <strong>
                        ₹{order.pricePerKg}
                        <small> / kg</small>
                      </strong>
                    </div>

                    <div className="order-detail-box">
                      <span>Total Amount</span>

                      <strong className="total-amount">
                        ₹{order.totalAmount}
                      </strong>
                    </div>

                    <div className="order-detail-box">
                      <span>Order Date</span>

                      <strong>
                        {formatDate(order.createdAt)}
                      </strong>
                    </div>
                  </div>

                  {/* INVOICE BUTTON */}

                  <div className="invoice-action">
                    <button
                      type="button"
                      className="invoice-button"
                      onClick={() => handlePrintInvoice(order)}
                    >
                      🧾 View / Print Invoice
                    </button>
                  </div>

                  {/* PAYMENT */}

                  <div className="order-payment">
                    <div>
                      <span>Payment</span>

                      <strong>
                        💵 {order.paymentMethod || "COD"}
                      </strong>
                    </div>

                    <div>
                      <span>Payment Status</span>

                      <strong
                        className={
                          order.paymentStatus === "Paid"
                            ? "payment-paid"
                            : "payment-pending"
                        }
                      >
                        {order.paymentStatus || "Pending"}
                      </strong>
                    </div>
                  </div>

                  {/* DELIVERY OTP INSTRUCTIONS */}

                  {order.status === "Ready" && (
                    <div className="return-request-panel">
                      <h3>
                        📧 Delivery Verification
                      </h3>

                      <p>
                        Your order is ready for delivery. A 6-digit
                        delivery OTP has been sent to your registered
                        email address.
                      </p>

                      <p>
                        <strong>What to do:</strong> Share the OTP
                        with the farmer only when you receive your
                        order.
                      </p>

                      <p className="return-note">
                        Do not share the OTP before receiving the
                        product. Check your email inbox and spam
                        folder if you cannot find the message.
                      </p>
                    </div>
                  )}

                  {/* RETURN REQUEST STATUS */}

                  {returnRequest ? (
                    <div className="return-request-panel">
                      <h3>Return Request</h3>

                      <div className="return-request-info">
                        <p>
                          <strong>Reason:</strong>{" "}
                          {returnRequest.reason}
                        </p>

                        <p>
                          <strong>Submitted:</strong>{" "}
                          {formatDateTime(
                            returnRequest.requestedAt
                          )}
                        </p>

                        {returnRequest.description && (
                          <p>
                            <strong>Description:</strong>{" "}
                            {returnRequest.description}
                          </p>
                        )}
                      </div>

                      <div className="return-status-row">
                        <span>Return Status</span>

                        <strong
                          className={`return-status-badge ${getReturnStatusClass(
                            returnRequest.status
                          )}`}
                        >
                          {returnRequest.status}
                        </strong>
                      </div>

                      {returnRequest.farmerResponse && (
                        <p className="return-farmer-response">
                          <strong>Farmer's response:</strong>{" "}
                          {returnRequest.farmerResponse}
                        </p>
                      )}

                      <div className="return-status-row">
                        <span>Refund Status</span>

                        <strong>
                          {returnRequest.refundStatus ||
                            "Not Applicable"}
                        </strong>
                      </div>

                      <p className="return-note">
                        Refund status is a tracking indicator. It
                        does not confirm that money has been
                        transferred.
                      </p>

                      {/* RETURN PICKUP TRACKING */}

                      <div className="return-request-panel">
                        <h3>
                          🚚 Return Pickup Tracking
                        </h3>

                        <div className="return-status-row">
                          <span>Pickup Status</span>

                          <strong>
                            {returnRequest.pickupStatus ||
                              "Not Scheduled"}
                          </strong>
                        </div>

                        {returnRequest.pickupScheduledAt && (
                          <div className="return-status-row">
                            <span>Scheduled Pickup</span>

                            <strong>
                              {formatDateTime(
                                returnRequest.pickupScheduledAt
                              )}
                            </strong>
                          </div>
                        )}

                        {returnRequest.pickupStatus ===
                          "Scheduled" && (
                          <div>
                            <p>
                              A pickup verification OTP has been sent
                              to your registered email address.
                            </p>

                            <p className="return-note">
                              Share the pickup OTP with the farmer
                              only when they arrive to collect the
                              returned product. Check your email
                              inbox and spam folder.
                            </p>
                          </div>
                        )}

                        {returnRequest.pickupStatus ===
                          "Collected" && (
                          <p className="return-note">
                            ✓ Your returned product has been
                            collected.
                          </p>
                        )}

                        {returnRequest.inspectionStatus && (
                          <div className="return-status-row">
                            <span>Product Inspection</span>

                            <strong>
                              {returnRequest.inspectionStatus}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : order.status === "Completed" ? (
                    <div className="return-request-panel">
                      <h3>
                        Need to Return This Order?
                      </h3>

                      {/* RETURN DEADLINE */}

                      {returnDeadline ? (
                        <div
                          className={`return-deadline-box ${
                            returnEligible
                              ? "return-deadline-active"
                              : "return-deadline-expired"
                          }`}
                        >
                          <p>
                            <strong>
                              Delivery Completed:
                            </strong>{" "}
                            {formatDateTime(order.completedAt)}
                          </p>

                          <p>
                            <strong>
                              Return Deadline:
                            </strong>{" "}
                            {formatDateTime(returnDeadline)}
                          </p>

                          <p className="return-countdown">
                            {returnEligible
                              ? `⏳ ${remainingTime}`
                              : "⛔ Return window expired"}
                          </p>

                          <p className="return-note">
                            Returns are allowed only within 6 hours
                            after order completion.
                          </p>
                        </div>
                      ) : (
                        <div className="return-deadline-box return-deadline-expired">
                          <p>
                            <strong>
                              Delivery completion time is unavailable.
                            </strong>
                          </p>

                          <p className="return-note">
                            This order cannot be returned because
                            its completion timestamp is missing.
                            Contact the administrator if this is a
                            newly completed order.
                          </p>
                        </div>
                      )}

                      {/* RETURN FORM */}

                      {returnEligible && (
                        <>
                          <p className="return-note">
                            Submit a return request with the reason
                            and details. The farmer must review it.
                          </p>

                          <div className="return-form">
                            <label
                              htmlFor={`reason-${order._id}`}
                            >
                              Return Reason
                            </label>

                            <select
                              id={`reason-${order._id}`}
                              value={returnForm.reason || ""}
                              onChange={(e) =>
                                updateReturnForm(
                                  order._id,
                                  "reason",
                                  e.target.value
                                )
                              }
                              disabled={
                                submittingOrderId === order._id
                              }
                            >
                              <option value="">
                                Select a reason
                              </option>

                              <option value="Damaged Product">
                                Damaged Product
                              </option>

                              <option value="Wrong Product">
                                Wrong Product
                              </option>

                              <option value="Poor Quality">
                                Poor Quality
                              </option>

                              <option value="Quantity Issue">
                                Quantity Issue
                              </option>

                              <option value="Other">
                                Other
                              </option>
                            </select>

                            <label
                              htmlFor={`description-${order._id}`}
                            >
                              Additional Details (Optional)
                            </label>

                            <textarea
                              id={`description-${order._id}`}
                              rows="3"
                              maxLength="1000"
                              placeholder="Describe the issue with your order..."
                              value={returnForm.description || ""}
                              onChange={(e) =>
                                updateReturnForm(
                                  order._id,
                                  "description",
                                  e.target.value
                                )
                              }
                              disabled={
                                submittingOrderId === order._id
                              }
                            />

                            <small className="return-character-count">
                              {(returnForm.description || "").length}
                              /1000 characters
                            </small>

                            <button
                              type="button"
                              className="return-submit-button"
                              onClick={() =>
                                handleReturnSubmit(order._id)
                              }
                              disabled={
                                submittingOrderId === order._id ||
                                !returnEligible
                              }
                            >
                              {submittingOrderId === order._id
                                ? "Submitting..."
                                : "Submit Return Request"}
                            </button>
                          </div>
                        </>
                      )}

                      {returnMessage && (
                        <p
                          className={`return-form-message ${returnMessage.type}`}
                          role="status"
                        >
                          {returnMessage.text}
                        </p>
                      )}
                    </div>
                  ) : null}

                  {/* FOOTER */}

                  <div className="order-card-footer">
                    <span>
                      🌱 Smart Farmer Marketplace
                    </span>

                    <span>
                      Order placed successfully
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyOrders;