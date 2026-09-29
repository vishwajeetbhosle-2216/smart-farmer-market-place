import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

function Cart() {
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  const navigate = useNavigate();

  // =========================
  // LOAD CART
  // =========================

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    try {
      const savedCart = JSON.parse(
        localStorage.getItem("smartFarmerCart") || "[]"
      );

      setCart(Array.isArray(savedCart) ? savedCart : []);
    } catch (error) {
      console.error("Cart loading error:", error);
      setCart([]);
    }
  };

  // =========================
  // SAVE CART
  // =========================

  const saveCart = (updatedCart) => {
    try {
      localStorage.setItem(
        "smartFarmerCart",
        JSON.stringify(updatedCart)
      );

      setCart(updatedCart);
    } catch (error) {
      console.error("Cart saving error:", error);
      setMessage("Unable to save cart. Please try again.");
    }
  };

  // =========================
  // INCREASE QUANTITY
  // =========================

  const increaseQuantity = (index) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];

    updatedCart[index] = {
      ...item,
      quantity: Number(item.quantity || 0) + 1,
    };

    saveCart(updatedCart);
  };

  // =========================
  // DECREASE QUANTITY
  // =========================

  const decreaseQuantity = (index) => {
    const updatedCart = [...cart];
    const item = updatedCart[index];

    const currentQuantity = Number(item.quantity || 0);

    if (currentQuantity <= 1) return;

    updatedCart[index] = {
      ...item,
      quantity: currentQuantity - 1,
    };

    saveCart(updatedCart);
  };

  // =========================
  // REMOVE ITEM
  // =========================

  const removeItem = (index) => {
    const updatedCart = cart.filter(
      (_, itemIndex) => itemIndex !== index
    );

    saveCart(updatedCart);
    setMessage("Product removed from cart.");

    setTimeout(() => setMessage(""), 2000);
  };

  // =========================
  // CLEAR CART
  // =========================

  const clearCart = () => {
    localStorage.removeItem("smartFarmerCart");
    setCart([]);
    setMessage("Cart cleared.");

    setTimeout(() => setMessage(""), 2000);
  };

  // =========================
  // ITEM TOTALS
  // =========================

  const getItemTotal = (item) => {
    return (
      Number(item.pricePerKg || 0) *
      Number(item.quantity || 0)
    );
  };

  const grandTotal = cart.reduce(
    (total, item) => total + getItemTotal(item),
    0
  );

  const totalItems = cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const totalProducts = cart.length;

  // =========================
  // CHECKOUT
  // =========================

  const handleCheckout = async () => {
    if (checkingOut) return;

    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please log in to place your order.");
      return;
    }

    setCheckingOut(true);
    setMessage("");

    try {
      // Send only product ID and quantity.
      // Backend fetches current price and farmer details.
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      }));

      const response = await fetch(
        "http://localhost:5000/api/orders/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Checkout failed. Please try again."
        );
        return;
      }

      // Clear cart only after successful checkout.
      localStorage.removeItem("smartFarmerCart");
      setCart([]);

      navigate("/buyer/my-orders", {
        state: {
          checkoutMessage:
            data.message || "Your orders were placed successfully.",
        },
      });
    } catch (error) {
      console.error("Checkout error:", error);

      setMessage(
        "Unable to connect to the server. Your cart has been preserved."
      );
    } finally {
      setCheckingOut(false);
    }
  };

  // =========================
  // EMPTY CART
  // =========================

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty-card">
          <div className="cart-empty-icon">🛒</div>

          <h1>Your Cart is Empty</h1>

          <p>
            Add fresh products directly from local farmers
            to your shopping cart.
          </p>

          <button
            type="button"
            className="cart-primary-button"
            onClick={() => navigate("/marketplace")}
          >
            🛍️ Go to Marketplace
          </button>
        </div>
      </div>
    );
  }

  // =========================
  // CART UI
  // =========================

  return (
    <div className="cart-page">
      <div className="cart-header">
        <div>
          <h1>🛒 My Cart</h1>

          <p>
            {totalProducts} different product
            {totalProducts !== 1 ? "s" : ""} ·{" "}
            {totalItems} total item
            {totalItems !== 1 ? "s" : ""}
          </p>
        </div>

        <button
          type="button"
          className="cart-clear-button"
          onClick={clearCart}
          disabled={checkingOut}
        >
          🗑️ Clear Cart
        </button>
      </div>

      {message && (
        <div className="cart-message" role="alert">
          {message}
        </div>
      )}

      <div className="cart-items">
        {cart.map((item, index) => (
          <div
            className="cart-item-card"
            key={`${item.productId}-${index}`}
          >
            <div className="cart-product-image">
              {item.image ? (
                <img src={item.image} alt={item.name} />
              ) : (
                <span>🌱</span>
              )}
            </div>

            <div className="cart-product-info">
              <h2>{item.name}</h2>

              <p className="cart-farmer-name">
                👨‍🌾 {item.farmerName || "Unknown farmer"}
              </p>

              <p className="cart-product-price">
                ₹{Number(item.pricePerKg || 0).toFixed(2)}
                <span> / {item.unit || "kg"}</span>
              </p>
            </div>

            <div className="cart-quantity-section">
              <p className="cart-section-label">Quantity</p>

              <div className="cart-quantity-controls">
                <button
                  type="button"
                  className="quantity-button"
                  onClick={() => decreaseQuantity(index)}
                  disabled={
                    checkingOut ||
                    Number(item.quantity) <= 1
                  }
                  aria-label={`Decrease ${item.name} quantity`}
                >
                  −
                </button>

                <span className="quantity-value">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  className="quantity-button"
                  onClick={() => increaseQuantity(index)}
                  disabled={checkingOut}
                  aria-label={`Increase ${item.name} quantity`}
                >
                  +
                </button>
              </div>

              <small className="cart-unit-label">
                {item.unit || "kg"}
              </small>
            </div>

            <div className="cart-item-total">
              <p className="cart-section-label">Item Total</p>

              <strong>
                ₹{getItemTotal(item).toFixed(2)}
              </strong>
            </div>

            <button
              type="button"
              className="cart-remove-button"
              onClick={() => removeItem(index)}
              disabled={checkingOut}
              title="Remove product"
              aria-label={`Remove ${item.name} from cart`}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <h2>Order Summary</h2>

        <div className="cart-summary-row">
          <span>Different Products</span>
          <strong>{totalProducts}</strong>
        </div>

        <div className="cart-summary-row">
          <span>Total Quantity</span>
          <strong>{totalItems}</strong>
        </div>

        <div className="cart-summary-divider"></div>

        <div className="cart-grand-total">
          <span>Grand Total</span>
          <strong>₹{grandTotal.toFixed(2)}</strong>
        </div>

        <button
          type="button"
          className="cart-checkout-button"
          onClick={handleCheckout}
          disabled={checkingOut}
        >
          {checkingOut
            ? "Placing Orders..."
            : "Proceed to Checkout →"}
        </button>

        <button
          type="button"
          className="cart-continue-button"
          onClick={() => navigate("/marketplace")}
          disabled={checkingOut}
        >
          Continue Shopping
        </button>
      </div>
    </div>
  );
}

export default Cart;