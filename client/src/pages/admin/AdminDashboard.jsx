import { useEffect, useState } from "react";
import "./AdminDashboard.css";

const API = "http://https://smart-farmer-api-g7q.onrender.com/api";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [resolutionLoading, setResolutionLoading] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [activeSection, setActiveSection] = useState("dashboard");

  const token = localStorage.getItem("token");

  const adminSections = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "products", label: "Products", icon: "🌾" },
    { id: "orders", label: "Orders", icon: "📦" },
    { id: "disputes", label: "Disputes", icon: "⚖️" },
  ];

  // ==========================================
  // API HELPER
  // ==========================================

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data;
  };

  // ==========================================
  // FETCH ADMIN DATA
  // ==========================================

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      const [usersData, productsData, ordersData] =
        await Promise.all([
          apiRequest("/admin/users"),
          apiRequest("/admin/products"),
          apiRequest("/admin/orders"),
        ]);

      setUsers(
        Array.isArray(usersData)
          ? usersData
          : usersData.users || []
      );

      setProducts(
        Array.isArray(productsData)
          ? productsData
          : productsData.products || []
      );

      setOrders(
        Array.isArray(ordersData)
          ? ordersData
          : ordersData.orders || []
      );
    } catch (error) {
      setMessage(error.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // NAVIGATION
  // ==========================================

  const goToSection = (sectionId) => {
    setActiveSection(sectionId);

    document
      .getElementById(`admin-${sectionId}`)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  const toggleUserStatus = async (userId) => {
    try {
      setActionLoading(userId);
      setMessage("");

      await apiRequest(`/admin/users/${userId}/status`, {
        method: "PUT",
      });

      setMessage("User status updated successfully.");

      await fetchAdminData();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setActionLoading("");
    }
  };

  // ==========================================
  // DISPUTE RESOLUTION
  // ==========================================

  const resolveDispute = async (orderId, resolution) => {
    const adminNotes = resolutionNotes[orderId]?.trim();

    if (!adminNotes) {
      setMessage("Please enter admin notes before resolving.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to resolve this dispute as "${resolution}"?`
    );

    if (!confirmed) return;

    try {
      setResolutionLoading(orderId);
      setMessage("");

      await apiRequest(
        `/orders/${orderId}/return/resolve`,
        {
          method: "PUT",
          body: JSON.stringify({
            resolution,
            adminNotes,
          }),
        }
      );

      setMessage("Dispute resolved successfully.");

      setResolutionNotes((prev) => ({
        ...prev,
        [orderId]: "",
      }));

      await fetchAdminData();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setResolutionLoading("");
    }
  };

  // ==========================================
  // FORMAT HELPERS
  // ==========================================

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getName = (person) => {
    if (!person) return "N/A";

    if (typeof person === "string") return person;

    return person.name || person.fullName || person.email || "N/A";
  };

  const getEmail = (person) => {
    if (!person) return "N/A";

    if (typeof person === "string") return "N/A";

    return person.email || "N/A";
  };

  const getId = (item) => {
    if (!item) return "";

    return item._id || item.id || "";
  };

 // ==========================================
// GET PRODUCT / EVIDENCE IMAGE URL
// ==========================================
const getImageUrl = (image) => {
  if (!image) return "";

  // Base64 images uploaded from AddProduct.jsx
  if (image.startsWith("data:image/")) {
    return image;
  }

  // Images hosted at an external URL
  if (
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }

  // Images stored as backend file paths
  return `http://https://smart-farmer-api-g7q.onrender.com/${image.replace(
    /^\/+/,
    ""
  )}`;
};

  const getProductName = (order) => {
    if (!order.product) return "Product unavailable";

    if (typeof order.product === "string") {
      return "Product";
    }

    return order.product.name || "Product";
  };

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalUsers = users.length;

  const totalFarmers = users.filter(
    (user) => user.role === "farmer"
  ).length;

  const totalBuyers = users.filter(
    (user) => user.role === "buyer"
  ).length;

  const totalProducts = products.length;

  const pendingOrders = orders.filter(
    (order) => order.status === "Pending"
  ).length;

  const completedOrders = orders.filter(
    (order) => order.status === "Completed"
  ).length;

  const completedSales = orders
    .filter((order) => order.status === "Completed")
    .reduce(
      (total, order) => total + Number(order.totalAmount || 0),
      0
    );

  // ==========================================
  // DISPUTES
  // ==========================================

  const disputedOrders = orders.filter(
    (order) =>
      order.returnRequest?.status === "Disputed" &&
      order.returnRequest?.adminResolution === "Pending"
  );

  const resolvedDisputes = orders.filter(
    (order) =>
      order.returnRequest?.adminResolution === "Buyer Approved" ||
      order.returnRequest?.adminResolution === "Farmer Approved"
  );

  const displayedDisputes =
    activeTab === "all"
      ? disputedOrders
      : resolvedDisputes;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="admin-dashboard-page">
        <div className="no-orders">
          <div>⏳</div>
          <h3>Loading Admin Dashboard</h3>
          <p>Please wait while we fetch your data.</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <div className="admin-dashboard-page">

      {/* ======================================
          HERO
      ====================================== */}

      <section className="admin-hero">
        <div className="admin-hero-content">
          <span className="admin-badge">
            ADMIN CONTROL CENTER
          </span>

          <h1>Admin Dashboard</h1>

          <p>
            Manage users, products, orders, and resolve
            marketplace disputes from one place.
          </p>
        </div>

        <div className="admin-hero-icon">
          🛡️
        </div>
      </section>

      {/* ======================================
          MESSAGE
      ====================================== */}

      {message && (
        <div className="admin-message" role="status">
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* ======================================
          QUICK NAVIGATION
      ====================================== */}

      <nav className="admin-section-nav">
        {adminSections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={
              activeSection === section.id
                ? "admin-nav-button active"
                : "admin-nav-button"
            }
            onClick={() => goToSection(section.id)}
          >
            <span>{section.icon}</span>
            {section.label}
          </button>
        ))}
      </nav>

      {/* ======================================
          DASHBOARD STATISTICS
      ====================================== */}

      <section
        className="admin-section"
        id="admin-dashboard"
      >
        <div className="section-heading">
          <div>
            <span className="section-label">
              OVERVIEW
            </span>

            <h2>Marketplace Overview</h2>

            <p>
              A quick summary of your marketplace activity.
            </p>
          </div>

          <button
            type="button"
            className="admin-nav-button"
            onClick={fetchAdminData}
          >
            🔄 Refresh
          </button>
        </div>

        <div className="admin-stats">

          <div className="admin-stat-card">
            <div className="admin-stat-icon">👥</div>
            <div>
              <span>Total Users</span>
              <strong>{totalUsers}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">🌾</div>
            <div>
              <span>Farmers</span>
              <strong>{totalFarmers}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">🛒</div>
            <div>
              <span>Buyers</span>
              <strong>{totalBuyers}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">📦</div>
            <div>
              <span>Total Products</span>
              <strong>{totalProducts}</strong>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="admin-stat-icon">⏳</div>
            <div>
              <span>Pending Orders</span>
              <strong>{pendingOrders}</strong>
            </div>
          </div>

          <div className="admin-stat-card sales-card">
            <div className="admin-stat-icon">💰</div>
            <div>
              <span>Completed Sales</span>
              <strong>{formatCurrency(completedSales)}</strong>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================
          DISPUTE RESOLUTION
      ====================================== */}

      <section
        className="admin-section dispute-admin-section"
        id="admin-disputes"
      >
        <div className="section-heading">
          <div>
            <span className="section-label">
              CUSTOMER SUPPORT
            </span>

            <h2>Dispute Resolution</h2>

            <p>
              Review buyer complaints and farmer responses,
              then record an admin decision.
            </p>
          </div>

          <span className="section-count dispute-count">
            {disputedOrders.length} Pending
          </span>
        </div>

        <div className="dispute-summary">

          <div className="dispute-summary-card">
            <span>Pending Disputes</span>
            <strong>{disputedOrders.length}</strong>
          </div>

          <div className="dispute-summary-card">
            <span>Resolved Disputes</span>
            <strong>{resolvedDisputes.length}</strong>
          </div>

        </div>

        <div className="dispute-tabs">
          <button
            type="button"
            className={activeTab === "all" ? "active" : ""}
            onClick={() => setActiveTab("all")}
          >
            Pending Disputes ({disputedOrders.length})
          </button>

          <button
            type="button"
            className={
              activeTab === "resolved" ? "active" : ""
            }
            onClick={() => setActiveTab("resolved")}
          >
            Resolved Disputes ({resolvedDisputes.length})
          </button>
        </div>

        {displayedDisputes.length === 0 ? (
          <div className="dispute-empty">
            <div>⚖️</div>

            <h3>
              {activeTab === "all"
                ? "No Pending Disputes"
                : "No Resolved Disputes"}
            </h3>

            <p>
              {activeTab === "all"
                ? "There are currently no disputes requiring admin attention."
                : "Resolved disputes will appear here."}
            </p>
          </div>
        ) : (
          <div className="dispute-list">
            {displayedDisputes.map((order) => {
              const ret = order.returnRequest || {};
              const isResolved =
                ret.adminResolution !== "Pending";

              return (
                <article
                  className={`dispute-card ${
                    isResolved ? "resolved-dispute-card" : ""
                  }`}
                  key={order._id}
                >

                  <div className="dispute-card-header">
                    <div>
                      <span className="dispute-order-id">
                        Order ID: {order._id}
                      </span>

                      <h3>{getProductName(order)}</h3>

                      <span className="dispute-status-badge">
                        {ret.status}
                      </span>
                    </div>

                    <div className="dispute-amount">
                      <span>Order Amount</span>
                      <strong>
                        {formatCurrency(order.totalAmount)}
                      </strong>
                    </div>
                  </div>

                  {/* Buyer and farmer */}

                  <div className="dispute-parties">

                    <div className="dispute-party">
                      <span>BUYER</span>

                      <strong>
                        {getName(order.buyer)}
                      </strong>

                      <small>
                        {getEmail(order.buyer)}
                      </small>
                    </div>

                    <div className="dispute-party">
                      <span>FARMER</span>

                      <strong>
                        {getName(order.farmer)}
                      </strong>

                      <small>
                        {getEmail(order.farmer)}
                      </small>
                    </div>

                  </div>

                  {/* Return information */}

                  <div className="dispute-information">

                    <div>
                      <span>RETURN REASON</span>
                      <strong>{ret.reason || "N/A"}</strong>
                    </div>

                    <div>
                      <span>REQUESTED ON</span>
                      <strong>
                        {formatDate(ret.requestedAt)}
                      </strong>
                    </div>

                    <div>
                      <span>RETURN STATUS</span>
                      <strong>{ret.status || "N/A"}</strong>
                    </div>

                    <div>
                      <span>QUANTITY</span>
                      <strong>{order.quantity}</strong>
                    </div>

                    <div>
                      <span>REFUND STATUS</span>
                      <strong>
                        {ret.refundStatus || "Not Applicable"}
                      </strong>
                    </div>

                    <div>
                      <span>PICKUP STATUS</span>
                      <strong>
                        {ret.pickupStatus || "Not Scheduled"}
                      </strong>
                    </div>

                  </div>

                  {/* Buyer complaint */}

                  <div className="dispute-description">
                    <h4>Buyer Complaint</h4>

                    <p>
                      {ret.description ||
                        "No additional description provided."}
                    </p>
                  </div>

                  {/* Farmer response */}

                  <div className="dispute-farmer-response">
                    <h4>Farmer Response</h4>

                    <p>
                      {ret.farmerResponse ||
                        "No response provided by the farmer."}
                    </p>
                  </div>

                  {/* Evidence */}

                  {ret.evidenceImage && (
                    <div className="dispute-evidence">
                      <h4>Buyer Evidence</h4>

                      <a
                        href={getImageUrl(ret.evidenceImage)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={getImageUrl(ret.evidenceImage)}
                          alt="Buyer return evidence"
                        />

                        View full evidence
                      </a>
                    </div>
                  )}

                  {/* Resolution result */}

                  {isResolved ? (
                    <div>
                      <span
                        className={`resolution-result ${
                          ret.adminResolution === "Buyer Approved"
                            ? "buyer-result"
                            : "farmer-result"
                        }`}
                      >
                        Decision: {ret.adminResolution}
                      </span>

                      <div className="dispute-description">
                        <h4>Admin Notes</h4>

                        <p>
                          {ret.adminNotes ||
                            "No admin notes available."}
                        </p>

                        <p style={{ marginTop: "10px" }}>
                          Resolved on: {formatDate(ret.resolvedAt)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Admin decision form */

                    <div className="dispute-resolution-form">
                      <label htmlFor={`notes-${order._id}`}>
                        Admin Resolution Notes
                      </label>

                      <textarea
                        id={`notes-${order._id}`}
                        value={resolutionNotes[order._id] || ""}
                        onChange={(e) =>
                          setResolutionNotes((prev) => ({
                            ...prev,
                            [order._id]: e.target.value,
                          }))
                        }
                        placeholder="Explain the reason for your decision..."
                        maxLength={1000}
                      />

                      <div className="dispute-notes-footer">
                        <small>
                          {(resolutionNotes[order._id] || "").length}
                          /1000 characters
                        </small>
                      </div>

                      <div className="dispute-action-buttons">

                        <button
                          type="button"
                          className="resolve-buyer-button"
                          disabled={
                            resolutionLoading === order._id
                          }
                          onClick={() =>
                            resolveDispute(
                              order._id,
                              "Buyer Approved"
                            )
                          }
                        >
                          {resolutionLoading === order._id
                            ? "Processing..."
                            : "✓ Approve Buyer"}
                        </button>

                        <button
                          type="button"
                          className="resolve-farmer-button"
                          disabled={
                            resolutionLoading === order._id
                          }
                          onClick={() =>
                            resolveDispute(
                              order._id,
                              "Farmer Approved"
                            )
                          }
                        >
                          {resolutionLoading === order._id
                            ? "Processing..."
                            : "✓ Approve Farmer"}
                        </button>

                      </div>
                    </div>
                  )}

                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================
          USER MANAGEMENT
      ====================================== */}

      <section
        className="admin-section"
        id="admin-users"
      >
        <div className="section-heading">
          <div>
            <span className="section-label">
              ACCOUNT CONTROL
            </span>

            <h2>User Management</h2>

            <p>
              View registered users and manage account access.
            </p>
          </div>

          <span className="section-count">
            {users.length} Users
          </span>
        </div>

        {users.length === 0 ? (
          <div className="no-orders">
            <div>👥</div>
            <h3>No Users Found</h3>
            <p>Registered users will appear here.</p>
          </div>
        ) : (
          <div className="users-table-wrapper">

            <div className="users-table-header">
              <span>User</span>
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {users.map((user) => {
              const isAdmin = user.role === "admin";

              const isActive = user.isActive !== false;

              return (
                <div className="user-row" key={user._id}>

                  <div className="user-name">
                    <div className="user-avatar">
                      {(user.name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <strong>{user.name || "Unnamed User"}</strong>
                  </div>

                  <div className="user-email">
                    {user.email || "N/A"}
                  </div>

                  <span
                    className={`role-badge ${user.role || "buyer"}`}
                  >
                    {user.role || "buyer"}
                  </span>

                  <span
                    className={`status-badge ${
                      isActive ? "active" : "blocked"
                    }`}
                  >
                    {isActive ? "Active" : "Blocked"}
                  </span>

                  <div>
                    {isAdmin ? (
                      <span className="admin-user-label">
                        Protected Admin
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={
                          isActive
                            ? "block-button"
                            : "unblock-button"
                        }
                        disabled={actionLoading === user._id}
                        onClick={() =>
                          toggleUserStatus(user._id)
                        }
                      >
                        {actionLoading === user._id
                          ? "Please wait..."
                          : isActive
                          ? "Block User"
                          : "Unblock User"}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}

          </div>
        )}
      </section>

      {/* ======================================
          PRODUCT MANAGEMENT
      ====================================== */}

      <section
        className="admin-section"
        id="admin-products"
      >
        <div className="section-heading">
          <div>
            <span className="section-label">
              LISTING OVERSIGHT
            </span>

            <h2>Product Management</h2>

            <p>
              Monitor marketplace listings, prices, stock,
              and farmer information.
            </p>
          </div>

          <span className="section-count">
            {products.length} Products
          </span>
        </div>

        {products.length === 0 ? (
          <div className="no-orders">
            <div>🌾</div>
            <h3>No Products Found</h3>
            <p>
              Farmer listings will appear here.
            </p>
          </div>
        ) : (
          <div className="admin-products-grid">
            {products.map((product) => (
              <article
                className="admin-product-card"
                key={product._id}
              >

                <div className="admin-product-image">
                  {product.image ? (
                    <img
                      src={getImageUrl(product.image)}
                      alt={product.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="admin-no-image">
                      🌱
                    </div>
                  )}
                </div>

                <div className="admin-product-content">

                  <span className="product-category-badge">
                    {product.category || "Uncategorized"}
                  </span>

                  <h3>{product.name || "Unnamed Product"}</h3>

                  <p className="product-description">
                    {product.description ||
                      "No description provided."}
                  </p>

                  <div className="product-details">

                    <div>
                      <span>PRICE</span>
                      <strong>
                        {formatCurrency(product.pricePerKg)}
                      </strong>
                      <small>
                        /{product.unit || "kg"}
                      </small>
                    </div>

                    <div>
                      <span>AVAILABLE STOCK</span>
                      <strong>
                        {product.quantityAvailable ?? 0}
                      </strong>
                      <small>
                        {product.unit || "kg"}
                      </small>
                    </div>

                    <div>
                      <span>STATUS</span>
                      <strong>
                        {product.status || "Active"}
                      </strong>
                    </div>

                    <div>
                      <span>EXPIRY DATE</span>
                      <strong style={{ fontSize: "13px" }}>
                        {product.expiryDate
                          ? new Date(
                              product.expiryDate
                            ).toLocaleDateString("en-IN")
                          : "N/A"}
                      </strong>
                    </div>

                  </div>

                  <div className="product-farmer">
                    <strong>Farmer:</strong>{" "}
                    {getName(product.farmer)}
                    <br />

                    <strong>Email:</strong>{" "}
                    {getEmail(product.farmer)}
                  </div>

                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ======================================
          ORDER MANAGEMENT
      ====================================== */}

      <section
        className="admin-section"
        id="admin-orders"
      >
        <div className="section-heading">
          <div>
            <span className="section-label">
              ORDER OVERSIGHT
            </span>

            <h2>Order Management</h2>

            <p>
              Monitor order progress, buyers, farmers,
              and payment status.
            </p>
          </div>

          <span className="section-count">
            {orders.length} Orders
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="no-orders">
            <div>📦</div>
            <h3>No Orders Found</h3>
            <p>
              Orders placed by buyers will appear here.
            </p>
          </div>
        ) : (
          <div className="admin-orders-list">
            {orders.map((order) => (
              <article
                className="admin-order-card"
                key={order._id}
              >

                <div className="order-main">

  {/* PRODUCT IMAGE */}
  <div className="admin-order-product-image">
    {order.product?.image ? (
      <img
        src={getImageUrl(order.product.image)}
        alt={getProductName(order)}
        loading="lazy"
      />
    ) : (
      <div className="admin-order-no-image">
        🌾
        <span>No Image</span>
      </div>
    )}
  </div>

  <div className="admin-order-product-info">

    <span className="order-id">
      Order ID: {order._id}
    </span>

    <h3>{getProductName(order)}</h3>

    <span
      className={`order-status ${
        (order.status || "").toLowerCase()
      }`}
    >
      {order.status}
    </span>

  </div>

</div>
                <div className="order-details">

                  <div>
                    <span>BUYER</span>
                    <strong>
                      {getName(order.buyer)}
                    </strong>
                  </div>

                  <div>
                    <span>FARMER</span>
                    <strong>
                      {getName(order.farmer)}
                    </strong>
                  </div>

                  <div>
                    <span>QUANTITY</span>
                    <strong>
                      {order.quantity}{" "}
                      {order.product?.unit || "kg"}
                    </strong>
                  </div>

                  <div>
                    <span>PRICE / UNIT</span>
                    <strong>
                      {formatCurrency(order.pricePerKg)}
                    </strong>
                  </div>

                  <div>
                    <span>TOTAL AMOUNT</span>
                    <strong>
                      {formatCurrency(order.totalAmount)}
                    </strong>
                  </div>

                  <div>
                    <span>PAYMENT</span>
                    <strong>
                      {order.paymentMethod || "COD"}
                      {" · "}
                      {order.paymentStatus || "Pending"}
                    </strong>
                  </div>

                  <div>
                    <span>ORDER DATE</span>
                    <strong>
                      {formatDate(order.createdAt)}
                    </strong>
                  </div>

                  <div>
                    <span>DELIVERY COMPLETED</span>
                    <strong>
                      {formatDate(order.completedAt)}
                    </strong>
                  </div>

                  <div>
                    <span>RETURN STATUS</span>
                    <strong>
                      {order.returnRequest?.status ||
                        "No Return"}
                    </strong>
                  </div>

                </div>

              </article>
            ))}
          </div>
        )}
      </section>

      {/* ======================================
          FOOTER
      ====================================== */}

      <div
        style={{
          textAlign: "center",
          padding: "20px 10px",
          color: "#d0d8d2",
          fontSize: "13px",
        }}
      >
        Smart Farmer Marketplace · Admin Control Center
      </div>

    </div>
  );
}

export default AdminDashboard;