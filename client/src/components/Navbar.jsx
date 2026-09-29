import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();

  const loadUser = () => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("User data error:", error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    loadUser();

    window.addEventListener("authChanged", loadUser);
    window.addEventListener("storage", loadUser);

    return () => {
      window.removeEventListener("authChanged", loadUser);
      window.removeEventListener("storage", loadUser);
    };
  }, []);

  const handleNavigate = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setMenuOpen(false);

    window.dispatchEvent(new Event("authChanged"));

    navigate("/login");
  };

  return (
    <nav className="navbar">

      {/* Logo */}
      <div
        className="navbar-logo"
        onClick={() => handleNavigate("/")}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleNavigate("/");
          }
        }}
      >
        🌱 Smart Farmer
      </div>

      {/* Hamburger Menu Button */}
      <button
        className={`navbar-toggle ${
          menuOpen ? "active" : ""
        }`}
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label={
          menuOpen ? "Close navigation menu" : "Open navigation menu"
        }
        aria-expanded={menuOpen}
        aria-controls="navbar-navigation"
        type="button"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Navigation Links */}
      <div
        id="navbar-navigation"
        className={`navbar-links ${
          menuOpen ? "navbar-links-open" : ""
        }`}
      >

        {/* Common Links */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate("/");
          }}
        >
          Home
        </a>

        <a
          href="/marketplace"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate("/marketplace");
          }}
        >
          Marketplace
        </a>

        {/* Buyer Links */}
        {user?.role === "buyer" && (
          <>
            <a
              href="/buyer/nearby-products"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/buyer/nearby-products");
              }}
            >
              Nearby Products
            </a>

            <a
              href="/buyer/price-comparison"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/buyer/price-comparison");
              }}
            >
              Price Comparison
            </a>

            <a
              href="/buyer/price-assistant"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/buyer/price-assistant");
              }}
            >
              Price Assistant
            </a>

            <a
              href="/buyer/orders"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/buyer/orders");
              }}
            >
              My Orders
            </a>
          </>
        )}

        {/* Farmer Links */}
        {user?.role === "farmer" && (
          <>
            <a
              href="/farmer/dashboard"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/farmer/dashboard");
              }}
            >
              Dashboard
            </a>

            <a
              href="/farmer/products"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/farmer/products");
              }}
            >
              My Products
            </a>

            <a
              href="/farmer/orders"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/farmer/orders");
              }}
            >
              My Orders
            </a>

            <a
              href="/farmer/earnings"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/farmer/earnings");
              }}
            >
              Earnings
            </a>
          </>
        )}

        {/* Admin Links */}
        {user?.role === "admin" && (
          <a
            href="/admin/dashboard"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate("/admin/dashboard");
            }}
          >
            Admin Dashboard
          </a>
        )}

        {/* Logged Out */}
        {!user && (
          <>
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/login");
              }}
            >
              Login
            </a>

            <a
              href="/register"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/register");
              }}
            >
              Register
            </a>
          </>
        )}

        {/* Logged In */}
        {user && (
          <button
            className="navbar-logout"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        )}

      </div>
    </nav>
  );
}

export default Navbar;