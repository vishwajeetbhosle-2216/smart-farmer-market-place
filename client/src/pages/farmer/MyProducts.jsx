import { useEffect, useState } from "react";
import "./MyProducts.css";

function MyProducts() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("Loading products...");

  // Edit modal
  const [editingProduct, setEditingProduct] = useState(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    category: "",
    pricePerKg: "",
    quantityAvailable: "",
    unit: "kg",
  });

  const [editImage, setEditImage] = useState("");

  const [editMessage, setEditMessage] = useState("");
  const [saving, setSaving] = useState(false);


  // ==========================================
  // FETCH MY PRODUCTS
  // ==========================================

  const fetchMyProducts = async () => {
    const token = localStorage.getItem("token");

    try {
      setMessage("Loading products...");

      const response = await fetch(
        "http://localhost:5000/api/products/my-products",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Failed to load products"
        );
        return;
      }

      setProducts(data);

      if (data.length === 0) {
        setMessage(
          "You have not added any products yet."
        );
      } else {
        setMessage("");
      }

    } catch (error) {
      console.error(
        "Fetch products error:",
        error
      );

      setMessage(
        "Unable to connect to the server"
      );
    }
  };


  useEffect(() => {
    fetchMyProducts();
  }, []);


  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  const handleEditClick = (product) => {
    setEditingProduct(product);

    setEditForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      pricePerKg: product.pricePerKg || "",
      quantityAvailable:
        product.quantityAvailable || "",
      unit: product.unit || "kg",
    });

    setEditImage(product.image || "");

    setEditMessage("");
  };


  // ==========================================
  // CLOSE EDIT MODAL
  // ==========================================

  const closeEditModal = () => {
    if (saving) {
      return;
    }

    setEditingProduct(null);
    setEditImage("");
    setEditMessage("");
  };


  // ==========================================
  // HANDLE FORM CHANGE
  // ==========================================

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  // ==========================================
  // HANDLE IMAGE CHANGE
  // ==========================================

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // Only images
    if (!file.type.startsWith("image/")) {
      setEditMessage(
        "Please select a valid image file."
      );
      return;
    }

    // Maximum 3 MB
    if (file.size > 3 * 1024 * 1024) {
      setEditMessage(
        "Image size must be less than 3 MB."
      );
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setEditImage(reader.result);
      setEditMessage("");
    };

    reader.readAsDataURL(file);
  };


  // ==========================================
  // UPDATE PRODUCT
  // ==========================================

  const handleUpdateProduct = async (event) => {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!editingProduct) {
      return;
    }

    // Basic validation
    if (
      !editForm.name.trim() ||
      !editForm.category ||
      editForm.pricePerKg === "" ||
      editForm.quantityAvailable === ""
    ) {
      setEditMessage(
        "Please fill all required fields."
      );
      return;
    }

    if (
      Number(editForm.pricePerKg) < 0 ||
      Number(editForm.quantityAvailable) < 0
    ) {
      setEditMessage(
        "Price and quantity cannot be negative."
      );
      return;
    }

    try {
      setSaving(true);
      setEditMessage("Updating product...");

      const response = await fetch(
        `http://localhost:5000/api/products/${editingProduct._id}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            name: editForm.name.trim(),

            description:
              editForm.description.trim(),

            category: editForm.category,

            pricePerKg:
              Number(editForm.pricePerKg),

            quantityAvailable:
              Number(
                editForm.quantityAvailable
              ),

            unit: editForm.unit,

            image: editImage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setEditMessage(
          data.message ||
            "Failed to update product."
        );

        setSaving(false);

        return;
      }

      // Replace updated product in state
      setProducts((previousProducts) =>
        previousProducts.map((product) =>
          product._id === editingProduct._id
            ? data.product
            : product
        )
      );

      setEditMessage(
        "Product updated successfully!"
      );

      setTimeout(() => {
        setEditingProduct(null);
        setEditMessage("");
        setSaving(false);
      }, 800);

    } catch (error) {
      console.error(
        "Update product error:",
        error
      );

      setEditMessage(
        "Unable to connect to the server."
      );

      setSaving(false);
    }
  };


  // ==========================================
  // DELETE PRODUCT
  // ==========================================

  const handleDeleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const response = await fetch(
        `http://localhost:5000/api/products/${product._id}`,
        {
          method: "DELETE",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Failed to delete product."
        );
        return;
      }

      // Remove deleted product immediately
      setProducts((previousProducts) =>
        previousProducts.filter(
          (item) =>
            item._id !== product._id
        )
      );

      alert("Product deleted successfully.");

    } catch (error) {
      console.error(
        "Delete product error:",
        error
      );

      alert(
        "Unable to connect to the server."
      );
    }
  };


  return (
    <div className="my-products-page">

      {/* =========================
          PAGE HEADER
      ========================= */}

      <div className="my-products-header">

        <div>

          <div className="my-products-badge">
            🌾 Farmer Panel
          </div>

          <h1>
            My Products
          </h1>

          <p>
            Manage and monitor the products
            you have added to the marketplace.
          </p>

        </div>

        <div className="my-products-icon">
          🌱
        </div>

      </div>


      {/* =========================
          PRODUCT COUNT
      ========================= */}

      {products.length > 0 && (

        <div className="products-summary">

          <div>

            <strong>
              {products.length}
            </strong>

            <span>
              {products.length === 1
                ? " Product Listed"
                : " Products Listed"}
            </span>

          </div>

        </div>

      )}


      {/* =========================
          EMPTY / ERROR MESSAGE
      ========================= */}

      {message && products.length === 0 && (

        <div className="products-message">

          <div className="empty-icon">
            🌱
          </div>

          <h2>
            No Products Found
          </h2>

          <p>
            {message}
          </p>

        </div>

      )}


      {/* =========================
          PRODUCTS
      ========================= */}

      {products.length > 0 && (

        <div className="my-products-grid">

          {products.map((product) => (

            <div
              className="my-product-card"
              key={product._id}
            >

              {/* PRODUCT IMAGE */}

              <div className="my-product-image">

                {product.image ? (

                  <img
                    src={product.image}
                    alt={product.name}
                  />

                ) : (

                  <div className="no-product-image">
                    🌱
                  </div>

                )}

              </div>


              {/* PRODUCT CONTENT */}

              <div className="my-product-content">

                <div className="product-top-row">

                  <span className="product-category">
                    {product.category ||
                      "Farm Product"}
                  </span>

                </div>


                <h2>
                  {product.name}
                </h2>


                <p className="my-product-description">
                  {product.description ||
                    "Fresh farm product"}
                </p>


                {/* PRICE + QUANTITY */}

                <div className="product-detail-row">

                  <div className="product-detail">

                    <span>
                      Price
                    </span>

                    <strong>
                      ₹{product.pricePerKg}
                    </strong>

                    <small>
                      / {product.unit || "kg"}
                    </small>

                  </div>


                  <div className="product-detail">

                    <span>
                      Available
                    </span>

                    <strong>
                      {product.quantityAvailable}
                    </strong>

                    <small>
                      {product.unit || "kg"}
                    </small>

                  </div>

                </div>


                {/* STATUS */}

                <div className="product-status">

                  <span className="status-dot"></span>

                  Available in Marketplace

                </div>


                {/* ACTION BUTTONS */}

                <div className="product-actions">

                  <button
                    className="edit-product-button"
                    onClick={() =>
                      handleEditClick(product)
                    }
                  >
                    ✏️ Edit
                  </button>


                  <button
                    className="delete-product-button"
                    onClick={() =>
                      handleDeleteProduct(product)
                    }
                  >
                    🗑️ Delete
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      )}


      {/* =========================
          EDIT PRODUCT MODAL
      ========================= */}

      {editingProduct && (

        <div
          className="edit-modal-overlay"
          onClick={closeEditModal}
        >

          <div
            className="edit-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="edit-modal-header">

              <div>
                <h2>
                  ✏️ Edit Product
                </h2>

                <p>
                  Update your product details.
                </p>
              </div>

              <button
                className="close-modal-button"
                onClick={closeEditModal}
              >
                ×
              </button>

            </div>


            {/* EDIT FORM */}

            <form
              className="edit-product-form"
              onSubmit={handleUpdateProduct}
            >

              {/* PRODUCT NAME */}

              <div className="form-group">

                <label>
                  Product Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  placeholder="Enter product name"
                />

              </div>


              {/* DESCRIPTION */}

              <div className="form-group">

                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  placeholder="Enter product description"
                  rows="3"
                />

              </div>


              {/* CATEGORY */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Category *
                  </label>

                  <select
                    name="category"
                    value={editForm.category}
                    onChange={handleEditChange}
                  >

                    <option value="">
                      Select Category
                    </option>

                    <option value="Vegetables">
                      Vegetables
                    </option>

                    <option value="Fruits">
                      Fruits
                    </option>

                    <option value="Flowers">
                      Flowers
                    </option>

                  </select>

                </div>


                {/* UNIT */}

                <div className="form-group">

                  <label>
                    Unit
                  </label>

                  <select
                    name="unit"
                    value={editForm.unit}
                    onChange={handleEditChange}
                  >

                    <option value="kg">
                      Kilogram (kg)
                    </option>

                    <option value="quintal">
                      Quintal
                    </option>

                    <option value="ton">
                      Ton
                    </option>

                  </select>

                </div>

              </div>


              {/* PRICE + QUANTITY */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Price *
                  </label>

                  <input
                    type="number"
                    name="pricePerKg"
                    value={editForm.pricePerKg}
                    onChange={handleEditChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter price"
                  />

                </div>


                <div className="form-group">

                  <label>
                    Available Quantity *
                  </label>

                  <input
                    type="number"
                    name="quantityAvailable"
                    value={
                      editForm.quantityAvailable
                    }
                    onChange={handleEditChange}
                    min="0"
                    step="0.01"
                    placeholder="Enter quantity"
                  />

                </div>

              </div>


              {/* IMAGE */}

              <div className="form-group">

                <label>
                  Product Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />

                <small className="image-help">
                  Maximum image size: 3 MB
                </small>

              </div>


              {/* IMAGE PREVIEW */}

              {editImage && (

                <div className="edit-image-preview">

                  <img
                    src={editImage}
                    alt="Product preview"
                  />

                </div>

              )}


              {/* MESSAGE */}

              {editMessage && (

                <div
                  className={
                    editMessage.includes(
                      "successfully"
                    )
                      ? "edit-success-message"
                      : "edit-error-message"
                  }
                >
                  {editMessage}
                </div>

              )}


              {/* FORM BUTTONS */}

              <div className="edit-form-actions">

                <button
                  type="button"
                  className="cancel-edit-button"
                  onClick={closeEditModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-product-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default MyProducts;