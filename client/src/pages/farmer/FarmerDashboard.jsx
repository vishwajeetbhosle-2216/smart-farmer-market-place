import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FarmerDashboard.css";

function FarmerDashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token");

      try {
        // =========================
        // FETCH FARMER PRODUCTS
        // =========================

        const productsResponse = await fetch(
          "https://smart-farmer-api-g7q.onrender.com/api/products/my-products",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const productsData =
          await productsResponse.json();

        if (productsResponse.ok) {
          setProducts(productsData);
        }

        // =========================
        // FETCH FARMER ORDERS
        // =========================

        const ordersResponse = await fetch(
          "https://smart-farmer-api-g7q.onrender.com/api/orders/farmer-orders",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const ordersData =
          await ordersResponse.json();

        if (ordersResponse.ok) {
          setOrders(ordersData);
        }

      } catch (error) {
        console.error(
          "Dashboard data error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // =========================
  // ORDER STATISTICS
  // =========================

  const pendingOrders = orders.filter(
    (order) =>
      order.status === "Pending"
  ).length;

  const completedOrders = orders.filter(
    (order) =>
      order.status === "Completed"
  ).length;

  // =========================
  // TOTAL SALES
  // =========================

  const totalSales = orders
    .filter(
      (order) =>
        order.status === "Completed"
    )
    .reduce(
      (total, order) =>
        total +
        Number(
          order.totalAmount || 0
        ),
      0
    );

  return (
    <div className="farmer-dashboard-page">

      {/* =================================
          WELCOME SECTION
      ================================= */}

      <section className="farmer-welcome">

        <div className="welcome-content">

          <span className="farmer-badge">
            🌾 Farmer Panel
          </span>

          <h1>
            Welcome, {user?.name || "Farmer"}!
          </h1>

          <p>
            Manage your farm products,
            orders and marketplace activities
            from one place.
          </p>

        </div>

        <div className="farmer-welcome-icon">
          🌱
        </div>

      </section>


      {/* =================================
          STATISTICS
      ================================= */}

      <section className="farmer-stats">

        {/* PRODUCTS */}

        <div className="stat-card">

          <div className="stat-icon">
            🌱
          </div>

          <div className="stat-info">

            <span>
              My Products
            </span>

            <strong>
              {loading
                ? "..."
                : products.length}
            </strong>

          </div>

        </div>


        {/* TOTAL ORDERS */}

        <div className="stat-card">

          <div className="stat-icon">
            📦
          </div>

          <div className="stat-info">

            <span>
              Total Orders
            </span>

            <strong>
              {loading
                ? "..."
                : orders.length}
            </strong>

          </div>

        </div>


        {/* PENDING */}

        <div className="stat-card">

          <div className="stat-icon">
            ⏳
          </div>

          <div className="stat-info">

            <span>
              Pending Orders
            </span>

            <strong>
              {loading
                ? "..."
                : pendingOrders}
            </strong>

          </div>

        </div>


        {/* COMPLETED */}

        <div className="stat-card">

          <div className="stat-icon">
            ✅
          </div>

          <div className="stat-info">

            <span>
              Completed
            </span>

            <strong>
              {loading
                ? "..."
                : completedOrders}
            </strong>

          </div>

        </div>

      </section>


      {/* =================================
          SALES
      ================================= */}

      <section className="sales-card">

        <div>

          <span className="sales-label">
            💰 Completed Sales
          </span>

          <h2>
            ₹{totalSales.toLocaleString("en-IN")}
          </h2>

          <p>
            Total value of completed orders
          </p>

        </div>

        <div className="sales-icon">
          💰
        </div>

      </section>


      {/* =================================
          MY FARM
      ================================= */}

      <section className="farmer-section">

        <div className="section-heading">

          <div>

            <h2>
              🌾 My Farm
            </h2>

            <p>
              Manage your products and customer
              orders from here.
            </p>

          </div>

        </div>


        <div className="farmer-action-grid">

          {/* ADD PRODUCT */}

          <div className="farmer-action-card">

            <div className="action-icon">
              ➕
            </div>

            <h3>
              Add Product
            </h3>

            <p>
              Add fresh farm products to the
              marketplace with price, quantity
              and product image.
            </p>

            <button
              onClick={() =>
                navigate(
                  "/farmer/add-product"
                )
              }
            >
              Add Product →
            </button>

          </div>


          {/* MY PRODUCTS */}

          <div className="farmer-action-card">

            <div className="action-icon">
              🌱
            </div>

            <h3>
              My Products
            </h3>

            <p>
              View and manage the products you
              have listed in the marketplace.
            </p>

            <button
              onClick={() =>
                navigate(
                  "/farmer/my-products"
                )
              }
            >
              View Products →
            </button>

          </div>


          {/* MY ORDERS */}

          <div className="farmer-action-card">

            <div className="action-icon">
              📦
            </div>

            <h3>
              My Orders
            </h3>

            <p>
              View customer orders and manage
              their status as you prepare products.
            </p>

            <button
              onClick={() =>
                navigate(
                  "/farmer/orders"
                )
              }
            >
              Manage Orders →
            </button>

          </div>

        </div>

      </section>


      {/* =================================
          FARMER TIP
      ================================= */}

      <section className="farmer-tip">

        <div className="tip-icon">
          💡
        </div>

        <div>

          <h3>
            Farmer Tip
          </h3>

          <p>
            Keep your product price, quantity
            and images updated to help buyers
            make better purchasing decisions.
          </p>

        </div>

      </section>

    </div>
  );
}

export default FarmerDashboard;