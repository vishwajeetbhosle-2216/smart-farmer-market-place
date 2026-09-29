import { useEffect, useState } from "react";
import "./FarmerOrders.css";

const API_URL = "http://localhost:5000/api/orders";

function FarmerOrders() {
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState("Loading orders...");

  const [reviewForms, setReviewForms] = useState({});
  const [reviewMessages, setReviewMessages] = useState({});
  const [submittingReviewId, setSubmittingReviewId] = useState(null);

  // Return workflow forms
  const [returnForms, setReturnForms] = useState({});
  const [returnMessages, setReturnMessages] = useState({});
  const [returnLoading, setReturnLoading] = useState({});

  // Delivery and pickup OTP forms
  const [deliveryOtps, setDeliveryOtps] = useState({});
  const [pickupOtps, setPickupOtps] = useState({});
  const [otpLoading, setOtpLoading] = useState({});

  const token = () => localStorage.getItem("token");

  // =========================
  // FETCH FARMER ORDERS
  // =========================

  const fetchFarmerOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/farmer-orders`, {
        headers: {
          Authorization: `Bearer ${token()}`,
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
      console.error("Farmer orders error:", error);
      setMessage("Unable to connect to the server");
    }
  };

  useEffect(() => {
    fetchFarmerOrders();
  }, []);

  // =========================
  // UPDATE ORDER STATUS
  // =========================

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`${API_URL}/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to update order");
        return;
      }

      setOrders((current) =>
        current.map((order) =>
          order._id === orderId
            ? {
                ...order,
                ...data.order,
                product: order.product,
                buyer: order.buyer,
              }
            : order
        )
      );

      setMessage(data.message || `Order ${status} successfully!`);
    } catch (error) {
      console.error("Update order error:", error);
      setMessage("Unable to connect to the server");
    }
  };

  // =========================
  // VERIFY DELIVERY OTP
  // =========================

  const verifyDeliveryOtp = async (orderId) => {
    const otp = deliveryOtps[orderId] || "";

    if (!/^\d{6}$/.test(otp)) {
      setMessage("Enter the valid 6-digit delivery OTP.");
      return;
    }

    setOtpLoading((prev) => ({
      ...prev,
      [orderId]: true,
    }));

    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/${orderId}/delivery/verify`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({ otp }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Delivery OTP verification failed."
        );
        return;
      }

      setDeliveryOtps((prev) => ({
        ...prev,
        [orderId]: "",
      }));

      setMessage(
        data.message || "Delivery verified successfully."
      );

      await fetchFarmerOrders();
    } catch (error) {
      console.error("Delivery OTP error:", error);
      setMessage("Unable to connect to the server.");
    } finally {
      setOtpLoading((prev) => ({
        ...prev,
        [orderId]: false,
      }));
    }
  };

  // =========================
  // FORM HELPERS
  // =========================

  const updateReviewForm = (orderId, field, value) => {
    setReviewForms((previous) => ({
      ...previous,
      [orderId]: {
        ...previous[orderId],
        [field]: value,
      },
    }));
  };

  const updateReturnForm = (orderId, field, value) => {
    setReturnForms((previous) => ({
      ...previous,
      [orderId]: {
        ...previous[orderId],
        [field]: value,
      },
    }));
  };

  const showReturnMessage = (orderId, type, text) => {
    setReturnMessages((previous) => ({
      ...previous,
      [orderId]: { type, text },
    }));
  };

  // =========================
  // COMMON RETURN API ACTION
  // =========================

  const returnAction = async (
    orderId,
    endpoint,
    body,
    successMessage
  ) => {
    setReturnLoading((previous) => ({
      ...previous,
      [orderId]: true,
    }));

    showReturnMessage(orderId, "", "");

    try {
      const response = await fetch(
        `${API_URL}/${orderId}/return/${endpoint}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        showReturnMessage(
          orderId,
          "error",
          data.message || `Failed to ${endpoint}`
        );
        return false;
      }

      if (data.order) {
        setOrders((previous) =>
          previous.map((order) =>
            order._id === orderId
              ? {
                  ...order,
                  ...data.order,
                  product: order.product,
                  buyer: order.buyer,
                }
              : order
          )
        );
      } else {
        await fetchFarmerOrders();
      }

      showReturnMessage(
        orderId,
        "success",
        data.message || successMessage
      );

      return true;
    } catch (error) {
      console.error("Return workflow error:", error);

      showReturnMessage(
        orderId,
        "error",
        "Unable to connect to the server."
      );

      return false;
    } finally {
      setReturnLoading((previous) => ({
        ...previous,
        [orderId]: false,
      }));
    }
  };

  // =========================
  // REVIEW RETURN REQUEST
  // =========================

  const reviewReturnRequest = async (orderId, decision) => {
    const form = reviewForms[orderId] || {};

    if (!form.farmerResponse?.trim()) {
      setReviewMessages((previous) => ({
        ...previous,
        [orderId]: {
          type: "error",
          text: "Please enter a response to the buyer.",
        },
      }));
      return;
    }

    const labels = {
      Accepted: "accept this return request",
      Disputed: "dispute this return request",
      Rejected: "reject this return request",
    };

    if (!window.confirm(`Are you sure you want to ${labels[decision]}?`)) {
      return;
    }

    setSubmittingReviewId(orderId);

    setReviewMessages((previous) => ({
      ...previous,
      [orderId]: null,
    }));

    try {
      const response = await fetch(
        `${API_URL}/${orderId}/return/review`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({
            decision,
            farmerResponse: form.farmerResponse.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setReviewMessages((previous) => ({
          ...previous,
          [orderId]: {
            type: "error",
            text: data.message || "Failed to review return request.",
          },
        }));
        return;
      }

      setOrders((previous) =>
        previous.map((order) =>
          order._id === orderId
            ? {
                ...order,
                returnRequest:
                  data.order?.returnRequest || order.returnRequest,
              }
            : order
        )
      );

      setReviewMessages((previous) => ({
        ...previous,
        [orderId]: {
          type: "success",
          text: data.message || "Return request reviewed successfully.",
        },
      }));

      setReviewForms((previous) => ({
        ...previous,
        [orderId]: { farmerResponse: "" },
      }));
    } catch (error) {
      console.error("Review return error:", error);

      setReviewMessages((previous) => ({
        ...previous,
        [orderId]: {
          type: "error",
          text: "Unable to connect to the server.",
        },
      }));
    } finally {
      setSubmittingReviewId(null);
    }
  };

  // =========================
  // SCHEDULE RETURN PICKUP
  // =========================

  const schedulePickup = async (orderId) => {
    const form = returnForms[orderId] || {};

    if (!form.pickupScheduledAt) {
      showReturnMessage(orderId, "error", "Select a pickup date and time.");
      return;
    }

    const scheduledDate = new Date(form.pickupScheduledAt);

    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      showReturnMessage(
        orderId,
        "error",
        "Pickup date and time must be in the future."
      );
      return;
    }

    const confirmed = window.confirm(
      "Schedule the return pickup for this date and time?"
    );

    if (!confirmed) return;

    const success = await returnAction(
      orderId,
      "pickup",
      {
        pickupScheduledAt: scheduledDate.toISOString(),
        pickupNotes: form.pickupNotes || "",
      },
      "Return pickup scheduled successfully."
    );

    if (success) {
      updateReturnForm(orderId, "pickupScheduledAt", "");
      updateReturnForm(orderId, "pickupNotes", "");
    }
  };
// =========================
// GENERATE RETURN PICKUP OTP
// =========================

const generatePickupOtp = async (orderId) => {
  if (
    !window.confirm(
      "Have you arrived at the buyer's pickup location? Generate and email the OTP now?"
    )
  ) {
    return;
  }

  setOtpLoading((prev) => ({
    ...prev,
    [orderId]: true,
  }));

  showReturnMessage(orderId, "", "");

  try {
    const response = await fetch(
      `${API_URL}/${orderId}/return/arrive`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token()}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      showReturnMessage(
        orderId,
        "error",
        data.message || "Failed to generate pickup OTP."
      );
      return;
    }

    showReturnMessage(
      orderId,
      "success",
      data.message ||
        "Pickup OTP sent to the buyer's registered email."
    );

    await fetchFarmerOrders();
  } catch (error) {
    console.error("Generate pickup OTP error:", error);

    showReturnMessage(
      orderId,
      "error",
      "Unable to connect to the server."
    );
  } finally {
    setOtpLoading((prev) => ({
      ...prev,
      [orderId]: false,
    }));
  }
};
  // =========================
  // VERIFY RETURN PICKUP OTP
  // =========================

  const markCollected = async (orderId) => {
    const otp = pickupOtps[orderId] || "";

    if (!/^\d{6}$/.test(otp)) {
      showReturnMessage(
        orderId,
        "error",
        "Enter the valid 6-digit pickup OTP."
      );
      return;
    }

    if (
      !window.confirm(
        "Confirm the buyer's pickup OTP and mark the product collected?"
      )
    ) {
      return;
    }

    const success = await returnAction(
      orderId,
      "collect",
      { otp },
      "Return pickup verified and product collected."
    );

    if (success) {
      setPickupOtps((prev) => ({
        ...prev,
        [orderId]: "",
      }));
    }
  };

  // =========================
  // INSPECT RETURNED PRODUCT
  // =========================

  const inspectReturn = async (orderId, inspectionStatus) => {
    const form = returnForms[orderId] || {};

    const label =
      inspectionStatus === "Resellable"
        ? "resellable"
        : "not resellable";

    if (
      !window.confirm(
        `Confirm that you inspected the returned product and marked it ${label}?`
      )
    ) {
      return;
    }

    await returnAction(
      orderId,
      "inspect",
      {
        inspectionStatus,
        inspectionNotes: form.inspectionNotes || "",
      },
      `Product inspection recorded: ${inspectionStatus}.`
    );
  };

  // =========================
  // UPDATE REFUND STATUS
  // =========================

  const updateRefund = async (orderId) => {
    const form = returnForms[orderId] || {};

    if (!form.refundStatus) {
      showReturnMessage(orderId, "error", "Select a refund status.");
      return;
    }

    const body = {
      refundStatus: form.refundStatus,
      refundNotes: form.refundNotes || "",
    };

    if (form.refundStatus === "Completed") {
      const amount = Number(form.refundAmount);

      if (!Number.isFinite(amount) || amount <= 0) {
        showReturnMessage(
          orderId,
          "error",
          "Enter a valid refund amount."
        );
        return;
      }

      if (!form.refundReference?.trim()) {
        showReturnMessage(
          orderId,
          "error",
          "Enter the refund transaction reference."
        );
        return;
      }

      body.refundAmount = amount;
      body.refundReference = form.refundReference.trim();
    }

    if (
      !window.confirm(
        form.refundStatus === "Completed"
          ? "Confirm that the refund has actually been paid to the buyer?"
          : `Update refund status to ${form.refundStatus}?`
      )
    ) {
      return;
    }

    const success = await returnAction(
      orderId,
      "refund",
      body,
      "Refund status updated successfully."
    );

    if (success) {
      setReturnForms((previous) => ({
        ...previous,
        [orderId]: {
          ...previous[orderId],
          refundStatus: "",
          refundNotes: "",
          refundReference: "",
          refundAmount: "",
        },
      }));
    }
  };

  // =========================
  // DATE FORMAT
  // =========================

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

  const getMinimumDateTime = () => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

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
        return "";
    }
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div className="farmer-orders-page">
      <div className="farmer-orders-header">
        <div className="farmer-orders-badge">🌾 Farmer Panel</div>
        <h1>My Orders</h1>
        <p>
          Manage customer orders and review product return requests
          from one place.
        </p>
      </div>

      {message && (
        <div className="farmer-orders-message">{message}</div>
      )}

      {orders.length === 0 &&
        !message.includes("Loading") &&
        !message.includes("Unable to connect") && (
          <div className="farmer-orders-empty">
            <div className="empty-order-icon">📦</div>
            <h2>No Orders Yet</h2>
            <p>
              When customers purchase your products, their orders
              will appear here.
            </p>
          </div>
        )}

      {orders.length > 0 && (
        <div className="farmer-orders-list">
          {orders.map((order) => {
            const ret = order.returnRequest;
            const reviewForm = reviewForms[order._id] || {};
            const reviewMessage = reviewMessages[order._id];
            const form = returnForms[order._id] || {};
            const workflowMessage = returnMessages[order._id];
            const loading = !!returnLoading[order._id];
            const otpBusy = !!otpLoading[order._id];

            const canReviewReturn = ret?.status === "Requested";
            const accepted = ret?.status === "Accepted";
            const collected = ret?.pickupStatus === "Collected";
            const inspected =
              ret?.inspectionStatus === "Resellable" ||
              ret?.inspectionStatus === "Not Resellable";

            return (
              <div className="farmer-order-card" key={order._id}>
                {/* PRODUCT IMAGE */}

                {order.product?.image && (
                  <div className="farmer-order-product-image">
                    <img
                      src={order.product.image}
                      alt={order.product?.name || "Product"}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* ORDER HEADER */}

                <div className="farmer-order-header">
                  <div>
                    <span className="order-label">PRODUCT</span>
                    <h2>{order.product?.name || "Product"}</h2>
                    <small>Order #{order._id?.slice(-6)}</small>
                  </div>

                  <span
                    className={`order-status status-${(
                      order.status || "Pending"
                    ).toLowerCase()}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* ORDER DETAILS */}

                <div className="farmer-order-details">
                  <div className="order-detail">
                    <span>👤 Buyer</span>
                    <strong>{order.buyer?.name || "Unknown"}</strong>
                  </div>

                  <div className="order-detail">
                    <span>📧 Email</span>
                    <strong>{order.buyer?.email || "Unknown"}</strong>
                  </div>

                  <div className="order-detail">
                    <span>📦 Quantity</span>
                    <strong>{order.quantity} kg</strong>
                  </div>

                  <div className="order-detail">
                    <span>💰 Price</span>
                    <strong>₹{order.pricePerKg} / kg</strong>
                  </div>

                  <div className="order-detail">
                    <span>💵 Total Amount</span>
                    <strong className="total-amount">
                      ₹{order.totalAmount}
                    </strong>
                  </div>

                  <div className="order-detail">
                    <span>💳 Payment</span>
                    <strong>{order.paymentMethod || "COD"}</strong>
                  </div>
                </div>

                {/* ORDER ACTIONS */}

                {order.status === "Pending" && (
                  <div className="farmer-order-actions">
                    <button
                      className="accept-button"
                      onClick={() =>
                        updateOrderStatus(order._id, "Accepted")
                      }
                    >
                      ✓ Accept Order
                    </button>

                    <button
                      className="reject-button"
                      onClick={() =>
                        updateOrderStatus(order._id, "Rejected")
                      }
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}

                {order.status === "Accepted" && (
                  <div className="farmer-order-actions">
                    <button
                      className="action-primary"
                      onClick={() =>
                        updateOrderStatus(order._id, "Preparing")
                      }
                    >
                      📦 Mark as Preparing
                    </button>
                  </div>
                )}

                {order.status === "Preparing" && (
                  <div className="farmer-order-actions">
                    <button
                      className="action-primary"
                      onClick={() =>
                        updateOrderStatus(order._id, "Ready")
                      }
                    >
                      ✓ Mark as Ready
                    </button>
                  </div>
                )}

                {/* DELIVERY OTP */}

                {order.status === "Ready" && (
                  <div className="farmer-order-actions">
                    <div className="otp-verification-box">
                      <h3>📧 Verify Delivery OTP</h3>

                      <p>
                        Ask the buyer for the 6-digit OTP sent to
                        their email.
                      </p>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit delivery OTP"
                        value={deliveryOtps[order._id] || ""}
                        onChange={(e) =>
                          setDeliveryOtps((prev) => ({
                            ...prev,
                            [order._id]: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 6),
                          }))
                        }
                        disabled={otpBusy}
                      />

                      <button
                        type="button"
                        className="action-primary"
                        disabled={otpBusy}
                        onClick={() =>
                          verifyDeliveryOtp(order._id)
                        }
                      >
                        {otpBusy
                          ? "Verifying..."
                          : "✓ Verify OTP & Complete Order"}
                      </button>
                    </div>
                  </div>
                )}

                {order.status === "Completed" && (
                  <div className="completed-message">
                    ✓ Order completed successfully
                  </div>
                )}

                {order.status === "Rejected" && (
                  <div className="rejected-message">
                    ✕ This order was rejected
                  </div>
                )}

                {/* RETURN WORKFLOW */}

                {ret && (
                  <div className="farmer-return-panel">
                    <div className="farmer-return-header">
                      <div>
                        <h3>↩️ Buyer Return Request</h3>
                        <p>
                          Review, collect, inspect, and record the
                          refund for this return.
                        </p>
                      </div>

                      <span
                        className={`farmer-return-badge ${getReturnStatusClass(
                          ret.status
                        )}`}
                      >
                        {ret.status}
                      </span>
                    </div>

                    {/* BUYER DETAILS */}

                    <div className="farmer-return-details">
                      <div>
                        <span>Return Reason</span>
                        <strong>{ret.reason}</strong>
                      </div>

                      <div>
                        <span>Requested On</span>
                        <strong>
                          {formatDateTime(ret.requestedAt)}
                        </strong>
                      </div>

                      <div>
                        <span>Buyer Description</span>
                        <strong>
                          {ret.description ||
                            "No additional details provided"}
                        </strong>
                      </div>
                    </div>

                    {ret.evidenceImage && (
                      <div className="farmer-return-evidence">
                        <strong>Buyer Evidence</strong>
                        <a
                          href={ret.evidenceImage}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View submitted evidence
                        </a>
                      </div>
                    )}

                    {/* FARMER REVIEW */}

                    {canReviewReturn ? (
                      <div className="farmer-return-review-form">
                        <label
                          htmlFor={`farmer-response-${order._id}`}
                        >
                          Your Response
                        </label>

                        <textarea
                          id={`farmer-response-${order._id}`}
                          rows="4"
                          maxLength="1000"
                          placeholder="Explain your decision to the buyer..."
                          value={reviewForm.farmerResponse || ""}
                          onChange={(e) =>
                            updateReviewForm(
                              order._id,
                              "farmerResponse",
                              e.target.value
                            )
                          }
                          disabled={
                            submittingReviewId === order._id
                          }
                        />

                        <small className="farmer-return-char-count">
                          {(reviewForm.farmerResponse || "").length}
                          /1000 characters
                        </small>

                        <div className="farmer-return-actions">
                          <button
                            type="button"
                            className="farmer-return-accept"
                            disabled={
                              submittingReviewId === order._id
                            }
                            onClick={() =>
                              reviewReturnRequest(
                                order._id,
                                "Accepted"
                              )
                            }
                          >
                            {submittingReviewId === order._id
                              ? "Submitting..."
                              : "✓ Accept Return"}
                          </button>

                          <button
                            type="button"
                            className="farmer-return-dispute"
                            disabled={
                              submittingReviewId === order._id
                            }
                            onClick={() =>
                              reviewReturnRequest(
                                order._id,
                                "Disputed"
                              )
                            }
                          >
                            Dispute
                          </button>

                          <button
                            type="button"
                            className="farmer-return-reject"
                            disabled={
                              submittingReviewId === order._id
                            }
                            onClick={() =>
                              reviewReturnRequest(
                                order._id,
                                "Rejected"
                              )
                            }
                          >
                            ✕ Reject Return
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="farmer-return-reviewed">
                        <p>
                          <strong>Farmer's Response:</strong>
                        </p>
                        <p>
                          {ret.farmerResponse ||
                            "No response provided."}
                        </p>

                        {ret.reviewedAt && (
                          <small>
                            Reviewed on{" "}
                            {formatDateTime(ret.reviewedAt)}
                          </small>
                        )}
                      </div>
                    )}

                    {reviewMessage && (
                      <p
                        className={`farmer-return-message ${reviewMessage.type}`}
                        role="status"
                      >
                        {reviewMessage.text}
                      </p>
                    )}

                    {/* PICKUP WORKFLOW */}

{accepted && (
  <div className="farmer-return-review-form">
    <h3>🚚 Return Pickup</h3>

    <div className="farmer-return-details">
      <div>
        <span>Pickup Status</span>
        <strong>
          {ret.pickupStatus || "Not Scheduled"}
        </strong>
      </div>

      {ret.pickupScheduledAt && (
        <div>
          <span>Scheduled For</span>
          <strong>
            {formatDateTime(ret.pickupScheduledAt)}
          </strong>
        </div>
      )}

      {ret.collectedAt && (
        <div>
          <span>Collected On</span>
          <strong>
            {formatDateTime(ret.collectedAt)}
          </strong>
        </div>
      )}
    </div>

    {/* SCHEDULE OR RESCHEDULE PICKUP */}

    {ret.pickupStatus !== "Collected" && (
      <>
        <label>
          {ret.pickupScheduledAt
            ? "Reschedule Pickup Date & Time"
            : "Pickup Date & Time"}
        </label>

        <input
          type="datetime-local"
          min={getMinimumDateTime()}
          value={form.pickupScheduledAt || ""}
          onChange={(e) =>
            updateReturnForm(
              order._id,
              "pickupScheduledAt",
              e.target.value
            )
          }
          disabled={loading || otpBusy}
        />

        <label>Pickup Notes</label>

        <textarea
          rows="2"
          maxLength="500"
          placeholder="Pickup instructions or buyer coordination notes..."
          value={
            form.pickupNotes !== undefined
              ? form.pickupNotes
              : ret.pickupNotes || ""
          }
          onChange={(e) =>
            updateReturnForm(
              order._id,
              "pickupNotes",
              e.target.value
            )
          }
          disabled={loading || otpBusy}
        />

        <button
          type="button"
          className="action-primary"
          disabled={loading || otpBusy}
          onClick={() => schedulePickup(order._id)}
        >
          {loading
            ? "Processing..."
            : ret.pickupScheduledAt
            ? "Update Pickup Schedule"
            : "Schedule Pickup"}
        </button>
      </>
    )}

    {/* GENERATE OTP AFTER ARRIVAL */}

    {ret.pickupStatus === "Scheduled" && (
      <div className="otp-verification-box">
        <h3>📍 Farmer Arrival & OTP</h3>

        <p>
          Generate the OTP only after arriving at the
          buyer's pickup location. The OTP will be sent
          to the buyer's registered email.
        </p>

        <button
          type="button"
          className="action-primary"
          disabled={otpBusy || loading}
          onClick={() => generatePickupOtp(order._id)}
        >
          {otpBusy
            ? "Generating OTP..."
            : "I've Arrived — Generate OTP"}
        </button>

        <p>
          Ask the buyer for the 6-digit OTP after it
          has been sent to their email.
        </p>

        <label>Buyer's Pickup OTP</label>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter 6-digit pickup OTP"
          value={pickupOtps[order._id] || ""}
          onChange={(e) =>
            setPickupOtps((prev) => ({
              ...prev,
              [order._id]: e.target.value
                .replace(/\D/g, "")
                .slice(0, 6),
            }))
          }
          disabled={otpBusy || loading}
        />

        <button
          type="button"
          className="action-primary"
          disabled={
            otpBusy ||
            loading ||
            !/^\d{6}$/.test(
              pickupOtps[order._id] || ""
            )
          }
          onClick={() => markCollected(order._id)}
        >
          {loading
            ? "Verifying..."
            : "✓ Verify OTP & Confirm Collection"}
        </button>
      </div>
    )}

    {/* COLLECTION COMPLETED */}

    {ret.pickupStatus === "Collected" && (
      <div className="completed-message">
        ✓ Product collected successfully
      </div>
    )}
  </div>
)}

                    {/* PRODUCT INSPECTION */}

                    {accepted && collected && (
                      <div className="farmer-return-review-form">
                        <h3>🔍 Product Inspection</h3>

                        <div className="farmer-return-details">
                          <div>
                            <span>Inspection Status</span>
                            <strong>
                              {ret.inspectionStatus || "Not Inspected"}
                            </strong>
                          </div>

                          {ret.inspectionNotes && (
                            <div>
                              <span>Inspection Notes</span>
                              <strong>{ret.inspectionNotes}</strong>
                            </div>
                          )}

                          {ret.inspectedAt && (
                            <div>
                              <span>Inspected On</span>
                              <strong>
                                {formatDateTime(ret.inspectedAt)}
                              </strong>
                            </div>
                          )}
                        </div>

                        {!inspected && (
                          <>
                            <label>Inspection Notes</label>

                            <textarea
                              rows="3"
                              maxLength="1000"
                              placeholder="Describe the condition of the returned product..."
                              value={form.inspectionNotes || ""}
                              onChange={(e) =>
                                updateReturnForm(
                                  order._id,
                                  "inspectionNotes",
                                  e.target.value
                                )
                              }
                              disabled={loading}
                            />

                            <div className="farmer-return-actions">
                              <button
                                type="button"
                                className="farmer-return-accept"
                                disabled={loading}
                                onClick={() =>
                                  inspectReturn(
                                    order._id,
                                    "Resellable"
                                  )
                                }
                              >
                                ✓ Resellable
                              </button>

                              <button
                                type="button"
                                className="farmer-return-reject"
                                disabled={loading}
                                onClick={() =>
                                  inspectReturn(
                                    order._id,
                                    "Not Resellable"
                                  )
                                }
                              >
                                Not Resellable
                              </button>
                            </div>
                          </>
                        )}

                        {inspected && (
                          <div className="completed-message">
                            ✓ Inspection completed: {ret.inspectionStatus}
                          </div>
                        )}
                      </div>
                    )}

                    {/* REFUND TRACKING */}

                    <div className="farmer-return-review-form">
                      <h3>💰 Refund Tracking</h3>

                      <div className="farmer-return-details">
                        <div>
                          <span>Refund Status</span>
                          <strong>
                            {ret.refundStatus || "Not Applicable"}
                          </strong>
                        </div>

                        {ret.refundAmount != null &&
                          ret.refundAmount > 0 && (
                            <div>
                              <span>Refund Amount</span>
                              <strong>₹{ret.refundAmount}</strong>
                            </div>
                          )}

                        {ret.refundReference && (
                          <div>
                            <span>Transaction Reference</span>
                            <strong>{ret.refundReference}</strong>
                          </div>
                        )}

                        {ret.refundedAt && (
                          <div>
                            <span>Refunded On</span>
                            <strong>
                              {formatDateTime(ret.refundedAt)}
                            </strong>
                          </div>
                        )}
                      </div>

                      {ret.status === "Received" &&
                        ret.refundStatus !== "Completed" && (
                          <>
                            <label>Refund Status</label>

                            <select
                              value={form.refundStatus || ""}
                              onChange={(e) =>
                                updateReturnForm(
                                  order._id,
                                  "refundStatus",
                                  e.target.value
                                )
                              }
                              disabled={loading}
                            >
                              <option value="">
                                Select refund status
                              </option>
                              <option value="Processing">
                                Processing
                              </option>
                              <option value="Completed">
                                Completed
                              </option>
                              <option value="Failed">
                                Failed
                              </option>
                            </select>

                            {form.refundStatus === "Completed" && (
                              <>
                                <label>Actual Refund Amount (₹)</label>

                                <input
                                  type="number"
                                  min="0.01"
                                  max={order.totalAmount}
                                  step="0.01"
                                  placeholder="Enter amount actually refunded"
                                  value={form.refundAmount || ""}
                                  onChange={(e) =>
                                    updateReturnForm(
                                      order._id,
                                      "refundAmount",
                                      e.target.value
                                    )
                                  }
                                  disabled={loading}
                                />

                                <label>
                                  Transaction Reference
                                </label>

                                <input
                                  type="text"
                                  maxLength="200"
                                  placeholder="UPI / bank transaction reference"
                                  value={form.refundReference || ""}
                                  onChange={(e) =>
                                    updateReturnForm(
                                      order._id,
                                      "refundReference",
                                      e.target.value
                                    )
                                  }
                                  disabled={loading}
                                />
                              </>
                            )}

                            <label>Refund Notes</label>

                            <textarea
                              rows="2"
                              maxLength="500"
                              placeholder="Refund method or additional notes..."
                              value={form.refundNotes || ""}
                              onChange={(e) =>
                                updateReturnForm(
                                  order._id,
                                  "refundNotes",
                                  e.target.value
                                )
                              }
                              disabled={loading}
                            />

                            <button
                              type="button"
                              className="action-primary"
                              disabled={loading || !form.refundStatus}
                              onClick={() => updateRefund(order._id)}
                            >
                              {loading
                                ? "Processing..."
                                : "Update Refund Status"}
                            </button>
                          </>
                        )}

                      {ret.refundStatus === "Completed" && (
                        <div className="completed-message">
                          ✓ Refund recorded as completed
                        </div>
                      )}
                    </div>

                    {/* WORKFLOW MESSAGE */}

                    {workflowMessage?.text && (
                      <p
                        className={`farmer-return-message ${workflowMessage.type}`}
                        role="status"
                      >
                        {workflowMessage.text}
                      </p>
                    )}

                    <p className="farmer-return-note">
                      Stock is restored by the backend only after
                      inspection marks the product resellable.
                      Refund completion must only be recorded after
                      the actual payment has been made. This page
                      records refunds; it does not transfer money.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FarmerOrders;