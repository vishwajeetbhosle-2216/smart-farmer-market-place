import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PriceComparison.css";

function PriceComparison() {
  const [productName, setProductName] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // ==========================================
  // COMPARE PRODUCT PRICES
  // GPS IS NOT REQUIRED
  // ==========================================
  const comparePrices = async () => {
    const searchName = productName.trim();

    if (!searchName) {
      setResult(null);
      setMessage("Please enter a product name.");
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setMessage("Comparing prices from available farmers...");

      // No GPS coordinates are required.
      // Backend searches all active, non-expired products.
      const response = await fetch(
        `https://smart-farmer-api-g7q.onrender.com/api/products/compare-prices?name=${encodeURIComponent(
          searchName
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        setResult(null);

        setMessage(
          data.message || "Failed to compare prices."
        );

        return;
      }

      setResult(data);

      if (!data.products || data.products.length === 0) {
        setMessage(
          `No active sellers found for "${searchName}". Try another product name.`
        );
      } else {
        setMessage(
          `Found ${data.sellerCount} seller(s) for "${searchName}". Prices are sorted from lowest to highest.`
        );
      }
    } catch (error) {
      console.error("Price comparison error:", error);

      setResult(null);

      setMessage(
        "Unable to connect to the server. Please check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLE ENTER KEY
  // ==========================================
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !loading) {
      comparePrices();
    }
  };

  return (
    <div className="price-comparison-page">

      {/* ====================================== */}
      {/* PAGE HEADING */}
      {/* ====================================== */}

      <h1>Price Comparison</h1>

      <p className="price-subtitle">
        Compare prices from farmers and find
        the right price for your products.
      </p>

      {/* ====================================== */}
      {/* SEARCH SECTION */}
      {/* ====================================== */}

      <div className="price-search">

        <input
          type="text"
          placeholder="Enter product name (e.g. Tomato)"
          value={productName}
          onChange={(e) => {
            setProductName(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />

        <button
          type="button"
          onClick={comparePrices}
          disabled={loading}
        >
          {loading
            ? "Comparing..."
            : "📊 Compare Prices"}
        </button>

      </div>

      {/* ====================================== */}
      {/* STATUS MESSAGE */}
      {/* ====================================== */}

      {message && (
        <p
          className="price-message"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      {/* ====================================== */}
      {/* PRICE COMPARISON RESULTS */}
      {/* ====================================== */}

      {result && result.sellerCount > 0 && (

        <div className="price-results">

          {/* PRODUCT NAME */}

          <h2>
            Price Comparison: {result.productName}
          </h2>

          {/* ================================== */}
          {/* PRICE SUMMARY */}
          {/* ================================== */}

          <div className="price-summary">

            <div className="price-box">
              <span>Available Sellers</span>

              <strong>
                {result.sellerCount}
              </strong>
            </div>

            <div className="price-box">
              <span>Lowest Price</span>

              <strong>
                ₹{result.lowestPrice}
              </strong>

              <small>/ kg</small>
            </div>

            <div className="price-box">
              <span>Highest Price</span>

              <strong>
                ₹{result.highestPrice}
              </strong>

              <small>/ kg</small>
            </div>

            <div className="price-box">
              <span>Average Price</span>

              <strong>
                ₹{result.averagePrice}
              </strong>

              <small>/ kg</small>
            </div>

          </div>

          {/* ================================== */}
          {/* SELLER LIST */}
          {/* ================================== */}

          <h2 className="sellers-heading">
            Available Farmers
          </h2>

          <p className="price-results-subtitle">
            Farmers are listed from the lowest
            price to the highest price.
          </p>

          <div className="seller-list">

            {result.products.map((product) => (

              <div
                className="seller-card"
                key={product._id}
              >

                <h3>
                  {product.name}
                </h3>

                {/* PRICE */}

                <p className="seller-price">
                  ₹{product.pricePerKg} / kg
                </p>

                {/* FARMER */}

                <p>
                  <strong>Farmer:</strong>{" "}
                  {product.farmer?.name || "Unknown"}
                </p>

                {/* FARMER LOCATION */}

                {product.farmerLocation && (
                  <p>
                    <strong>Location:</strong>{" "}
                    {product.farmerLocation}
                  </p>
                )}

                {/* DISTANCE: ONLY WHEN AVAILABLE */}

                {product.distanceInKm !== undefined &&
                  product.distanceInKm !== null && (
                    <p className="seller-distance">
                      📍 {product.distanceInKm} km away
                    </p>
                  )}

                {/* QUANTITY */}

                <p>
                  <strong>Available:</strong>{" "}
                  {product.quantityAvailable}{" "}
                  {product.unit || "kg"}
                </p>

                {/* VIEW PRODUCT */}

                <button
                  type="button"
                  className="view-product-button"
                  onClick={() =>
                    navigate(`/product/${product._id}`)
                  }
                >
                  View Product
                </button>

              </div>

            ))}

          </div>

        </div>

      )}

    </div>
  );
}

export default PriceComparison;