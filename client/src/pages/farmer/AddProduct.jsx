import { useState } from "react";
import "./AddProduct.css";
import {
  getDeviceLocation,
  searchLocation,
} from "../../utils/location";

// CALCULATE SHELF LIFE
const getShelfLifeDays = (name, category) => {
  const productName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, "");

  const leafyVegetables = [
    "spinach",
    "palak",
    "coriander",
    "dhaniya",
    "mint",
    "pudina",
    "methi",
    "fenugreek",
    "lettuce",
    "curryleaves",
  ];

  if (
    leafyVegetables.some((item) =>
      productName.includes(item)
    )
  ) {
    return 3;
  }

  if (category === "Flowers") {
    return 3;
  }

  if (
    productName.includes("potato") ||
    productName.includes("aloo")
  ) {
    return 21;
  }

  if (
    productName.includes("tomato") ||
    productName.includes("tomat")
  ) {
    return 14;
  }

  return 7;
};

function AddProduct() {
  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    pricePerKg: "",
    quantityAvailable: "",
    unit: "kg",
    harvestDate: today,
    discountPercentage: "0",
  });

  const [image, setImage] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // LOCATION STATES
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [searchingLocation, setSearchingLocation] =
    useState(false);
  const [locationRequired, setLocationRequired] =
    useState(false);

  // CALCULATE ESTIMATED EXPIRY
  const shelfLifeDays = getShelfLifeDays(
    formData.name,
    formData.category
  );

  const calculateExpiryDate = () => {
    if (!formData.harvestDate) return "";

    const expiryDate = new Date(
      `${formData.harvestDate}T00:00:00`
    );

    expiryDate.setDate(
      expiryDate.getDate() + shelfLifeDays
    );

    const year = expiryDate.getFullYear();
    const month = String(
      expiryDate.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      expiryDate.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formattedExpiryDate =
    calculateExpiryDate();

  // HANDLE TEXT INPUTS
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // HANDLE PRODUCT IMAGE
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage(
        "Please select a valid image file."
      );
      e.target.value = "";
      setImage("");
      return;
    }

    const maxSize = 3 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage(
        "Image size must be less than 3 MB."
      );
      e.target.value = "";
      setImage("");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setImage(reader.result);
      setMessage("");
    };

    reader.onerror = () => {
      setMessage(
        "Unable to read the selected image."
      );
    };

    reader.readAsDataURL(file);
  };

  // ------------------------------------------------------
  // SEARCH FARMER LOCATION MANUALLY
  // ------------------------------------------------------
  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) {
      setMessage(
        "Please enter your village or location."
      );
      return;
    }

    setSearchingLocation(true);
    setMessage("");
    setLocationResults([]);

    try {
      const results = await searchLocation(
        locationSearch
      );

      if (results.length === 0) {
        setMessage(
          "No location found. Try searching with village, taluk and district."
        );
        return;
      }

      setLocationResults(results);
    } catch (error) {
      console.error(
        "Location search error:",
        error
      );

      setMessage(
        "Unable to search location. Please try again."
      );
    } finally {
      setSearchingLocation(false);
    }
  };

  // ------------------------------------------------------
  // SELECT MANUAL LOCATION
  // ------------------------------------------------------
  const handleSelectLocation = (location) => {
    setSelectedLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: 0,
      source: "manual",
      name: location.name,
    });

    setLocationResults([]);
    setLocationSearch(location.name);

    setLocationRequired(false);

    setMessage(
      "Farm location selected successfully."
    );
  };

  // ------------------------------------------------------
  // DETECT FARMER LOCATION
  // ------------------------------------------------------
  const handleDetectLocation = async () => {
    setMessage(
      "Detecting your farm location..."
    );

    setLocationRequired(false);

    try {
      const location = await getDeviceLocation();

      setSelectedLocation({
        ...location,
        name: "Current device location",
      });

      setLocationRequired(false);

      setMessage(
        `Location detected successfully. Accuracy: ${Math.round(
          location.accuracy
        )} meters.`
      );
    } catch (error) {
      console.error(
        "Farmer location error:",
        error
      );

      setSelectedLocation(null);

      if (error.type === "LOW_ACCURACY") {
        setLocationRequired(true);

        setMessage(
          `Automatic location is not accurate enough (${Math.round(
            error.accuracy
          )} meters). Please search and select your farm/village location manually.`
        );
      } else {
        setLocationRequired(true);

        setMessage(
          error.message ||
            "Unable to detect your location. Please select your farm location manually."
        );
      }
    }
  };

  // ------------------------------------------------------
  // SUBMIT PRODUCT
  // ------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage(
        "Please login before adding a product."
      );
      return;
    }

    if (!formData.category) {
      setMessage(
        "Please select a product category."
      );
      return;
    }

    if (!image) {
      setMessage(
        "Please select a product photo."
      );
      return;
    }

    // VALIDATE HARVEST DATE
    if (!formData.harvestDate) {
      setMessage(
        "Please select a harvest date."
      );
      return;
    }

    // VALIDATE DISCOUNT
    const discount = Number(
      formData.discountPercentage
    );

    if (discount < 0 || discount > 100) {
      setMessage(
        "Discount must be between 0 and 100."
      );
      return;
    }

    // LOCATION MUST BE SELECTED
    if (!selectedLocation) {
      setLocationRequired(true);

      setMessage(
        "Please detect your location or manually select your farm location before adding the product."
      );

      return;
    }

    setLoading(true);
    setMessage("Adding product...");

    try {
      const response = await fetch(
        "https://smart-farmer-api-g7q.onrender.com/api/products/add",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            ...formData,

            pricePerKg: Number(
              formData.pricePerKg
            ),

            quantityAvailable: Number(
              formData.quantityAvailable
            ),

            discountPercentage: discount,

            // GEOJSON FORMAT
            coordinates: [
              selectedLocation.longitude,
              selectedLocation.latitude,
            ],

            image: image,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message ||
            "Failed to add product."
        );
        return;
      }

      setMessage(
        "Product added successfully! 🎉"
      );

      // RESET FORM
      setFormData({
        name: "",
        description: "",
        category: "",
        pricePerKg: "",
        quantityAvailable: "",
        unit: "kg",
        harvestDate: today,
        discountPercentage: "0",
      });

      setImage("");

      // RESET LOCATION
      setSelectedLocation(null);
      setLocationSearch("");
      setLocationResults([]);
      setLocationRequired(false);

      // CLEAR FILE INPUT
      e.target.reset();
    } catch (error) {
      console.error(
        "Add product error:",
        error
      );

      setMessage(
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-product-page">

      <h1>Add Product</h1>

      <p>
        Add your farm product to the marketplace.
      </p>

      <form onSubmit={handleSubmit}>

        {/* PRODUCT NAME */}
        <div>
          <label>Product Name</label>

          <input
            type="text"
            name="name"
            placeholder="Example: Tomato"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label>Description</label>

          <textarea
            name="description"
            placeholder="Describe your product..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        {/* CATEGORY */}
        <div>
          <label>Category</label>

          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">
              Select Category
            </option>

            <option value="Vegetables">
              🥕 Vegetables
            </option>

            <option value="Fruits">
              🍎 Fruits
            </option>

            <option value="Flowers">
              🌸 Flowers
            </option>
          </select>
        </div>

        {/* PRICE */}
        <div>
          <label>Price Per Kg</label>

          <input
            type="number"
            name="pricePerKg"
            placeholder="Example: 30"
            value={formData.pricePerKg}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        {/* QUANTITY */}
        <div>
          <label>Available Quantity</label>

          <input
            type="number"
            name="quantityAvailable"
            placeholder="Example: 50"
            value={formData.quantityAvailable}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        {/* UNIT */}
        <div>
          <label>Unit</label>

          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
          >
            <option value="kg">
              kg
            </option>

            <option value="quintal">
              quintal
            </option>

            <option value="ton">
              ton
            </option>
          </select>
        </div>

        {/* HARVEST DATE */}
        <div>
          <label>Harvest Date</label>

          <input
            type="date"
            name="harvestDate"
            value={formData.harvestDate}
            onChange={handleChange}
            max={today}
            required
          />
        </div>

        {/* ESTIMATED EXPIRY DATE */}
        <div>
          <label>
            Estimated Expiry Date
          </label>

          <input
            type="date"
            value={formattedExpiryDate}
            readOnly
          />

          <small>
            Estimated shelf life:{" "}
            {shelfLifeDays} days.
            The system calculates the final
            expiry date automatically.
          </small>
        </div>

        {/* DISCOUNT */}
        <div>
          <label>
            Near-Expiry Discount (%)
          </label>

          <input
            type="number"
            name="discountPercentage"
            placeholder="Example: 10"
            value={
              formData.discountPercentage
            }
            onChange={handleChange}
            min="0"
            max="100"
          />

          <small>
            Optional discount between 0% and 100%.
          </small>
        </div>

        {/* PRODUCT PHOTO */}
        <div>
          <label>Product Photo</label>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
          />

          <small>
            Maximum photo size: 3 MB
          </small>
        </div>

        {/* IMAGE PREVIEW */}
        {image && (
          <div
            style={{
              marginTop: "15px",
              marginBottom: "15px",
              textAlign: "center",
            }}
          >
            <p>
              <strong>
                Photo Preview
              </strong>
            </p>

            <img
              src={image}
              alt="Product preview"
              style={{
                width: "240px",
                height: "200px",
                objectFit: "cover",
                borderRadius: "12px",
                border:
                  "2px solid #2e7d32",
              }}
            />
          </div>
        )}

        {/* FARM LOCATION */}
        <div
          style={{
            marginTop: "20px",
            padding: "18px",
            border: "1px solid #ddd",
            borderRadius: "12px",
          }}
        >
          <h3
            style={{
              marginBottom: "8px",
            }}
          >
            📍 Farm Location
          </h3>

          <p
            style={{
              marginBottom: "15px",
            }}
          >
            Your farm location is required
            so buyers can find nearby products.
          </p>

          {/* DETECT LOCATION */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={loading}
            style={{
              marginBottom: "15px",
            }}
          >
            📍 Detect My Location
          </button>

          {/* SELECTED LOCATION */}
          {selectedLocation && (
            <div
              style={{
                marginBottom: "15px",
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "#f1f8e9",
                border:
                  "1px solid #81c784",
              }}
            >
              <strong>
                ✓ Location Selected
              </strong>

              <p>
                {selectedLocation.name}
              </p>

              <p>
                Latitude:{" "}
                {selectedLocation.latitude}
              </p>

              <p>
                Longitude:{" "}
                {selectedLocation.longitude}
              </p>

              {selectedLocation.source ===
                "device" && (
                <p>
                  Accuracy:{" "}
                  {Math.round(
                    selectedLocation.accuracy
                  )}{" "}
                  meters
                </p>
              )}

              <p>
                Source:{" "}
                {selectedLocation.source ===
                "manual"
                  ? "Manual selection"
                  : "Device GPS"}
              </p>
            </div>
          )}

          {/* MANUAL LOCATION */}
          {(locationRequired ||
            !selectedLocation) && (
            <div>
              <label>
                Search Village / Town / Area
              </label>

              <input
                type="text"
                placeholder="Example: Ghatboral, Humnabad, Bidar"
                value={locationSearch}
                onChange={(e) =>
                  setLocationSearch(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLocationSearch();
                  }
                }}
              />

              <button
                type="button"
                onClick={
                  handleLocationSearch
                }
                disabled={
                  searchingLocation
                }
                style={{
                  marginTop: "10px",
                }}
              >
                {searchingLocation
                  ? "Searching..."
                  : "🔎 Search Location"}
              </button>

              {/* SEARCH RESULTS */}
              {locationResults.length >
                0 && (
                <div
                  style={{
                    marginTop: "15px",
                  }}
                >
                  <strong>
                    Select your correct location:
                  </strong>

                  {locationResults.map(
                    (location, index) => (
                      <button
                        key={`${location.latitude}-${location.longitude}-${index}`}
                        type="button"
                        onClick={() =>
                          handleSelectLocation(
                            location
                          )
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          marginTop: "8px",
                          padding: "12px",
                          cursor: "pointer",
                        }}
                      >
                        📍{" "}
                        {location.name}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Adding Product..."
            : "Add Product"}
        </button>
      </form>

      {/* MESSAGE */}
      {message && (
        <p>
          {message}
        </p>
      )}
    </div>
  );
}

export default AddProduct;