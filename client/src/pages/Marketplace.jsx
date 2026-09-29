import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./Marketplace.css";

function Marketplace() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("Loading products...");
  const [cartMessage, setCartMessage] = useState("");

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("smartFarmerCart") || "[]"
      );
    } catch {
      return [];
    }
  });

  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get("category") || "All";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setMessage("Loading products...");

        const response = await fetch(
          "http://localhost:5000/api/products"
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.message || "Failed to load products.");
          return;
        }

        setProducts(data);
        setMessage(
          data.length === 0
            ? "No products are available right now."
            : ""
        );
      } catch (error) {
        console.error("Marketplace error:", error);
        setMessage("Unable to connect to the server.");
      }
    };

    fetchProducts();
  }, []);

  const showCartMessage = (text) => {
    setCartMessage(text);

    setTimeout(() => {
      setCartMessage("");
    }, 2500);
  };

  const saveCart = (updatedCart) => {
    try {
      localStorage.setItem(
        "smartFarmerCart",
        JSON.stringify(updatedCart)
      );

      setCart(updatedCart);
    } catch (error) {
      console.error("Save cart error:", error);
      showCartMessage("Unable to save cart. Please try again.");
    }
  };

  const isInCart = (productId) =>
    cart.some((item) => item.productId === productId);

  const cartCount = cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const handleCategoryChange = (category) => {
    if (category === "All") {
      setSearchParams({});
    } else {
      setSearchParams({ category });
    }
  };

  const normalizeCategory = (category) => {
    const value = String(category || "").toLowerCase().trim();

    if (value === "vegetable" || value === "vegetables") {
      return "Vegetables";
    }

    if (value === "fruit" || value === "fruits") {
      return "Fruits";
    }

    if (value === "flower" || value === "flowers") {
      return "Flowers";
    }

    return category || "Other";
  };

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter(
          (product) =>
            normalizeCategory(product.category) ===
            selectedCategory
        );

  const viewProduct = (productId) => {
    window.location.href = `/product/${productId}`;
  };

  const addToCart = (product) => {
    try {
      const existingItemIndex = cart.findIndex(
        (item) => item.productId === product._id
      );

      if (existingItemIndex !== -1) {
        showCartMessage(
          `${product.name} is already in your cart.`
        );
        return;
      }

      const availableQuantity = Number(
        product.quantityAvailable
      );

      if (availableQuantity <= 0) {
        showCartMessage(
          `${product.name} is currently out of stock.`
        );
        return;
      }

      const newCartItem = {
        productId: product._id,
        name: product.name,
        image: product.image || "",
        pricePerKg: Number(product.pricePerKg),
        quantity: 1,
        unit: product.unit || "kg",
        farmerId:
          product.farmer?._id || product.farmer || null,
        farmerName:
          product.farmer?.name || "Unknown farmer",
      };

      saveCart([...cart, newCartItem]);

      showCartMessage(
        `${product.name} added to cart successfully.`
      );
    } catch (error) {
      console.error("Add to cart error:", error);
      showCartMessage("Unable to add product to cart.");
    }
  };

  const removeFromCart = (productId, productName) => {
    const updatedCart = cart.filter(
      (item) => item.productId !== productId
    );

    saveCart(updatedCart);

    showCartMessage(`${productName} removed from cart.`);
  };

  const openCart = () => {
    window.location.href = "/buyer/cart";
  };

  return (
    <div className="marketplace-page">
      {/* HEADER */}
      <header className="marketplace-header">
        <span className="marketplace-eyebrow">
          FARM FRESH · DIRECT FROM FARMERS
        </span>

        <h1>Marketplace</h1>

        <p>
          Fresh products directly from local farmers.
        </p>

        <button
          type="button"
          className="marketplace-cart-button"
          onClick={openCart}
        >
          <span aria-hidden="true">🛒</span>
          View Cart
          <span className="cart-count">{cartCount}</span>
        </button>
      </header>

      {/* CART MESSAGE */}
      {cartMessage && (
        <div className="marketplace-cart-message" role="status">
          <span aria-hidden="true">✓</span>
          {cartMessage}
        </div>
      )}

      {/* CATEGORY FILTERS */}
      <nav
        className="marketplace-categories"
        aria-label="Filter products by category"
      >
        {[
          { name: "All", icon: "🌱" },
          { name: "Vegetables", icon: "🥕" },
          { name: "Fruits", icon: "🍎" },
          { name: "Flowers", icon: "🌸" },
        ].map((category) => (
          <button
            key={category.name}
            type="button"
            className={`category-filter ${
              selectedCategory === category.name ? "active" : ""
            }`}
            aria-pressed={selectedCategory === category.name}
            onClick={() => handleCategoryChange(category.name)}
          >
            <span aria-hidden="true">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </nav>

      {/* SELECTED CATEGORY */}
      {selectedCategory !== "All" && (
        <h2 className="selected-category-title">
          {selectedCategory}
        </h2>
      )}

      {/* LOADING / ERROR / EMPTY MESSAGE */}
      {message && products.length === 0 && (
        <div className="marketplace-message" role="status">
          <span className="marketplace-message-icon">
            {message === "Loading products..." ? "🌱" : "🛒"}
          </span>
          <p>{message}</p>
        </div>
      )}

      {products.length > 0 && filteredProducts.length === 0 && (
        <div className="marketplace-message">
          <span className="marketplace-message-icon">🔎</span>
          <p>
            No products are available in {selectedCategory}.
          </p>
          <button
            type="button"
            className="reset-category-button"
            onClick={() => handleCategoryChange("All")}
          >
            View all products
          </button>
        </div>
      )}

      {/* PRODUCT GRID */}
      {filteredProducts.length > 0 && (
        <div className="marketplace-products">
          {filteredProducts.map((product) => {
            const productInCart = isInCart(product._id);

            const outOfStock =
              Number(product.quantityAvailable) <= 0;

            return (
              <article
                className="product-card"
                key={product._id}
              >
                {/* PRODUCT IMAGE */}
                <div className="product-image">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="no-product-image">
                      <span>🌱</span>
                      <p>Fresh from the farm</p>
                    </div>
                  )}

                  {outOfStock && (
                    <span className="stock-badge">
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* PRODUCT INFORMATION */}
                <div className="product-card-content">
                  <div className="product-card-top">
                    <span className="product-category">
                      {normalizeCategory(product.category)}
                    </span>

                    <h2>{product.name}</h2>

                    <p className="product-description">
                      {product.description ||
                        "Fresh farm product"}
                    </p>
                  </div>

                  <div className="product-price">
                    ₹{product.pricePerKg}
                    <span>
                      / {product.unit || "kg"}
                    </span>
                  </div>

                  <div className="product-meta">
                    <p className="product-available">
                      <span>Available</span>
                      <strong>
                        {product.quantityAvailable}{" "}
                        {product.unit || "kg"}
                      </strong>
                    </p>

                    <p className="product-farmer">
                      <span aria-hidden="true">👨‍🌾</span>
                      <strong>
                        {product.farmer?.name ||
                          "Unknown farmer"}
                      </strong>
                    </p>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="product-card-actions">
                    <button
                      type="button"
                      className="view-product-button"
                      onClick={() => viewProduct(product._id)}
                    >
                      View Product
                    </button>

                    {productInCart ? (
                      <button
                        type="button"
                        className="remove-cart-button"
                        onClick={() =>
                          removeFromCart(
                            product._id,
                            product.name
                          )
                        }
                      >
                        ✕ Remove from Cart
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="add-cart-button"
                        onClick={() => addToCart(product)}
                        disabled={outOfStock}
                      >
                        {outOfStock
                          ? "Out of Stock"
                          : "🛒 Add to Cart"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Marketplace;