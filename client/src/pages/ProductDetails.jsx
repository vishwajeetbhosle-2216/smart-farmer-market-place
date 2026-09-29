import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ProductDetails.css";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [message, setMessage] = useState(
    "Loading product..."
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  /* =========================
     FETCH PRODUCT
  ========================= */

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(
          `https://smart-farmer-api-g7q.onrender.com/api/products/${id}`
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(
            data.message ||
              "Failed to load product."
          );
          return;
        }

        setProduct(data);
        setMessage("");
      } catch (error) {
        console.error(
          "Product details error:",
          error
        );

        setMessage(
          "Unable to connect to the server."
        );
      }
    };

    fetchProduct();
  }, [id]);

  /* =========================
     INCREASE QUANTITY
  ========================= */

  const increaseQuantity = () => {
    if (
      product &&
      quantity < product.quantityAvailable
    ) {
      setQuantity(quantity + 1);
    }
  };

  /* =========================
     DECREASE QUANTITY
  ========================= */

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  /* =========================
     HANDLE QUANTITY INPUT
  ========================= */

  const handleQuantityChange = (e) => {
    let value = Number(e.target.value);

    if (!Number.isFinite(value)) {
      value = 1;
    }

    if (value < 1) {
      value = 1;
    }

    if (
      product &&
      value > product.quantityAvailable
    ) {
      value = product.quantityAvailable;
    }

    setQuantity(value);
  };

  /* =========================
     PLACE ORDER
  ========================= */

  const handlePlaceOrder = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage(
        "Please login before placing an order."
      );
      return;
    }

    if (!product) {
      return;
    }

    if (quantity <= 0) {
      setMessage(
        "Quantity must be greater than 0."
      );
      return;
    }

    if (
      quantity > product.quantityAvailable
    ) {
      setMessage(
        "Not enough quantity available."
      );
      return;
    }

    setLoading(true);
    setMessage("Placing your order...");

    try {
      const response = await fetch(
        "https://smart-farmer-api-g7q.onrender.com/api/orders/create",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            productId: product._id,
            quantity: Number(quantity),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Failed to place order."
        );

        setLoading(false);
        return;
      }

      setMessage(
        "Order placed successfully! Redirecting to My Orders..."
      );

      /*
        Give the user a short moment
        to see the success message.
      */

      setTimeout(() => {
        navigate("/buyer/orders");
      }, 1000);

    } catch (error) {
      console.error(
        "Place order error:",
        error
      );

      setMessage(
        "Unable to connect to the server."
      );

      setLoading(false);
    }
  };

  /* =========================
     LOADING / ERROR
  ========================= */

  if (!product) {
    return (
      <div className="product-details-page">
        <div className="product-details-loading">
          {message}
        </div>
      </div>
    );
  }

  /* =========================
     TOTAL AMOUNT
  ========================= */

  const totalAmount =
    Number(quantity) *
    Number(product.pricePerKg);

  /* =========================
     CATEGORY ICON
  ========================= */

  const getCategoryIcon = () => {
    const category = String(
      product.category || ""
    ).toLowerCase();

    if (category.includes("vegetable")) {
      return "🥕";
    }

    if (category.includes("fruit")) {
      return "🍎";
    }

    if (category.includes("flower")) {
      return "🌸";
    }

    return "🌱";
  };

  return (
    <div className="product-details-page">

      <div className="product-details-container">

        {/* =================================
            LEFT SIDE - PRODUCT IMAGE
        ================================= */}

        <div className="product-details-image-section">

          <div className="product-image-wrapper">

            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="product-details-image"
              />
            ) : (
              <div className="product-details-image-placeholder">
                <div>
                  {getCategoryIcon()}
                </div>

                <span>
                  No product photo
                </span>
              </div>
            )}

          </div>

          <div className="image-caption">
            🌱 Fresh from local farmers
          </div>

        </div>


        {/* =================================
            RIGHT SIDE - PRODUCT INFORMATION
        ================================= */}

        <div className="product-details-info">

          {/* CATEGORY */}

          <div className="product-category-badge">
            {getCategoryIcon()}{" "}
            {product.category}
          </div>


          {/* PRODUCT NAME */}

          <h1>
            {product.name}
          </h1>


          {/* DESCRIPTION */}

          <p className="product-details-description">
            {product.description ||
              "Fresh quality product directly from the farmer."}
          </p>


          {/* PRICE */}

          <div className="product-details-price">
            ₹{product.pricePerKg}
            <span>
              / {product.unit || "kg"}
            </span>
          </div>


          {/* FARMER */}

          <div className="seller-box">

            <div className="seller-icon">
              👨‍🌾
            </div>

            <div>
              <span>
                Sold by
              </span>

              <strong>
                {product.farmer?.name ||
                  "Unknown Farmer"}
              </strong>

              {product.farmer?.email && (
                <small>
                  {product.farmer.email}
                </small>
              )}
            </div>

          </div>


          {/* STOCK */}

          <div className="stock-box">

            <div>
              <span>
                📦 Available Stock
              </span>

              <strong>
                {product.quantityAvailable}{" "}
                {product.unit || "kg"}
              </strong>
            </div>

            <strong className="in-stock">
              ● In Stock
            </strong>

          </div>


          {/* =================================
              ORDER BOX
          ================================= */}

          <div className="order-box">

            <h2>
              Buy this product
            </h2>


            {/* QUANTITY */}

            <div className="quantity-control">

              <label>
                Select Quantity (
                {product.unit || "kg"}
                )
              </label>

              <div className="quantity-input-wrapper">

                <button
                  type="button"
                  onClick={
                    decreaseQuantity
                  }
                  disabled={
                    quantity <= 1 ||
                    loading
                  }
                >
                  −
                </button>

                <input
                  type="number"
                  min="1"
                  max={
                    product.quantityAvailable
                  }
                  value={quantity}
                  onChange={
                    handleQuantityChange
                  }
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={
                    increaseQuantity
                  }
                  disabled={
                    quantity >=
                      product.quantityAvailable ||
                    loading
                  }
                >
                  +
                </button>

              </div>

              <small>
                Maximum available:{" "}
                {product.quantityAvailable}{" "}
                {product.unit || "kg"}
              </small>

            </div>


            {/* TOTAL */}

            <div className="total-price-box">

              <span>
                Total Amount
              </span>

              <strong>
                ₹{totalAmount.toFixed(2)}
              </strong>

            </div>


            {/* PAYMENT */}

            <div className="payment-method">

              <span>
                💳 Payment Method
              </span>

              <strong>
                Cash on Delivery / Pay on Pickup
              </strong>

            </div>


            {/* PLACE ORDER */}

            <button
              className="place-order-button"
              onClick={
                handlePlaceOrder
              }
              disabled={loading}
            >
              {loading
                ? "Placing Order..."
                : "🛒 Place Order"}
            </button>


            {/* MESSAGE */}

            {message && (
              <p
                className={
                  message.includes(
                    "successfully"
                  )
                    ? "product-message success"
                    : "product-message"
                }
              >
                {message}
              </p>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}

export default ProductDetails;