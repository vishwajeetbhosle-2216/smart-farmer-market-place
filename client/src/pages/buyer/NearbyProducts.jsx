import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NearbyProducts.css";

import {
  getDeviceLocation,
  searchLocation,
} from "../../utils/location";

function NearbyProducts() {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [buyerLocation, setBuyerLocation] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

  const navigate = useNavigate();

  // --------------------------------------------------
  // SAVE BUYER LOCATION TO MONGODB
  // --------------------------------------------------
  const saveBuyerLocation = async (
    latitude,
    longitude,
    locationName
  ) => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please login to save your location.");
    }

    const response = await fetch(
      "https://smart-farmer-api-g7q.onrender.com/api/users/location",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          locationName,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to save buyer location."
      );
    }

    console.log("Buyer location saved:", data);

    return data;
  };

  // --------------------------------------------------
  // GET LOCATION NAME
  // --------------------------------------------------
  const getLocationName = async (
    latitude,
    longitude
  ) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Unable to get location name");
      }

      const data = await response.json();

      return (
        data.address?.village ||
        data.address?.town ||
        data.address?.city ||
        data.address?.municipality ||
        data.address?.county ||
        data.display_name ||
        "Location found"
      );
    } catch (error) {
      console.error("Reverse geocoding error:", error);

      return "Location name unavailable";
    }
  };

  // --------------------------------------------------
  // FETCH NEARBY PRODUCTS AND SAVE BUYER LOCATION
  // --------------------------------------------------
  const fetchNearbyProducts = async (
    latitude,
    longitude,
    accuracy,
    locationName
  ) => {
    try {
      setLoading(true);

      setCoordinates({
        latitude,
        longitude,
        accuracy,
      });

      setBuyerLocation(locationName);

      setMessage("Saving your location...");

      // Save buyer's selected location to MongoDB.
      // If saving fails, still allow nearby product search.
      try {
        await saveBuyerLocation(
          latitude,
          longitude,
          locationName
        );

        setMessage(
          "Location saved. Finding fresh products within 30 km..."
        );
      } catch (locationError) {
        console.error(
          "Buyer location save error:",
          locationError
        );

        setMessage(
          "Unable to save your location, but searching for nearby products..."
        );
      }

      // Fetch products within 30 km.
      const response = await fetch(
        `https://smart-farmer-api-g7q.onrender.com/api/products/nearby?longitude=${longitude}&latitude=${latitude}&maxDistance=30000`
      );

      const data = await response.json();

      if (!response.ok) {
        setProducts([]);

        setMessage(
          data.message ||
            "Failed to find nearby products."
        );

        return;
      }

      setProducts(data);

      if (data.length === 0) {
        setMessage(
          "No products found within 30 km."
        );
      } else {
        setMessage(
          `${data.length} nearby product(s) found within 30 km.`
        );
      }
    } catch (error) {
      console.error("Nearby products error:", error);

      setProducts([]);

      setMessage(
        "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // AUTOMATIC DEVICE LOCATION
  // --------------------------------------------------
  const findNearbyProducts = async () => {
    setProducts([]);
    setBuyerLocation("");
    setCoordinates(null);

    setMessage("Getting your accurate location...");

    try {
      const location = await getDeviceLocation();

      const {
        latitude,
        longitude,
        accuracy,
      } = location;

      console.log(
        "Accepted device location:",
        location
      );

      const locationName = await getLocationName(
        latitude,
        longitude
      );

      await fetchNearbyProducts(
        latitude,
        longitude,
        accuracy,
        locationName
      );
    } catch (error) {
      console.error("Device location error:", error);

      if (error.type === "LOW_ACCURACY") {
        setCoordinates({
          latitude: error.latitude,
          longitude: error.longitude,
          accuracy: error.accuracy,
        });

        setMessage(
          `⚠️ Location accuracy is too low (${Math.round(
            error.accuracy
          )} meters). Please search and select your location below.`
        );

        return;
      }

      if (error.type === "PERMISSION_DENIED") {
        setMessage(
          "📍 Location permission was denied. Please allow location access or select your location manually."
        );

        return;
      }

      if (error.type === "POSITION_UNAVAILABLE") {
        setMessage(
          "📍 Your device could not determine your location. Please select your location manually."
        );

        return;
      }

      if (error.type === "TIMEOUT") {
        setMessage(
          "⏳ Location request timed out. Please try again or select your location manually."
        );

        return;
      }

      if (error.type === "UNSUPPORTED") {
        setMessage(
          "❌ Location detection is not supported. Please select your location manually."
        );

        return;
      }

      setMessage(
        error.message ||
          "Unable to determine your location."
      );
    }
  };

  // --------------------------------------------------
  // SEARCH LOCATION
  // --------------------------------------------------
  const handleLocationSearch = async () => {
    if (!searchText.trim()) {
      setMessage("Please enter a location.");
      return;
    }

    try {
      setSearchingLocation(true);
      setLocationResults([]);

      setMessage("Searching for location...");

      const results = await searchLocation(searchText);

      setLocationResults(results);

      if (results.length === 0) {
        setMessage("No matching location found.");
      } else {
        setMessage("Select your location from the results.");
      }
    } catch (error) {
      console.error("Location search error:", error);

      setMessage(
        "Unable to search for this location."
      );
    } finally {
      setSearchingLocation(false);
    }
  };

  // --------------------------------------------------
  // SELECT MANUAL LOCATION
  // --------------------------------------------------
  const handleSelectLocation = async (location) => {
    setLocationResults([]);

    setSearchText(location.name);

    setMessage(
      "Location selected. Saving location and finding nearby products..."
    );

    await fetchNearbyProducts(
      location.latitude,
      location.longitude,
      0,
      location.name
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="nearby-products-page">
      <h1>Nearby Products</h1>

      <p className="nearby-subtitle">
        Find fresh products from farmers within 30 km.
      </p>

      {/* AUTOMATIC LOCATION */}
      <div className="nearby-action">
        <button
          className="find-nearby-button"
          onClick={findNearbyProducts}
          disabled={loading}
        >
          {loading
            ? "📍 Detecting Location..."
            : "📍 Detect My Location"}
        </button>
      </div>

      {/* MANUAL LOCATION */}
      <div
        style={{
          maxWidth: "600px",
          margin: "25px auto",
          padding: "20px",
          background: "#ffffff",
          color: "#111111",
          borderRadius: "12px",
          border: "2px solid #2e7d32",
          textAlign: "left",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            color: "#111111",
          }}
        >
          🗺️ Select Your Location
        </h3>

        <p
          style={{
            color: "#333333",
            marginBottom: "15px",
          }}
        >
          If your laptop cannot detect your exact
          location, search for your village, town or city.
        </p>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            type="text"
            value={searchText}
            onChange={(e) =>
              setSearchText(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLocationSearch();
              }
            }}
            placeholder="Example: Humnabad, Karnataka"
            style={{
              flex: 1,
              padding: "12px",
              border: "1px solid #777",
              borderRadius: "8px",
              color: "#111111",
              background: "#ffffff",
            }}
          />

          <button
            type="button"
            onClick={handleLocationSearch}
            disabled={searchingLocation}
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              background: "#2e7d32",
              color: "#ffffff",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            {searchingLocation
              ? "Searching..."
              : "Search"}
          </button>
        </div>

        {/* SEARCH RESULTS */}
        {locationResults.length > 0 && (
          <div style={{ marginTop: "15px" }}>
            <p
              style={{
                fontWeight: "700",
                color: "#111111",
              }}
            >
              Select your location:
            </p>

            {locationResults.map((location, index) => (
              <button
                key={`${location.latitude}-${location.longitude}-${index}`}
                type="button"
                onClick={() =>
                  handleSelectLocation(location)
                }
                style={{
                  display: "block",
                  width: "100%",
                  marginBottom: "8px",
                  padding: "12px",
                  textAlign: "left",
                  border: "1px solid #aaa",
                  borderRadius: "8px",
                  background: "#f5f5f5",
                  color: "#111111",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                📍 {location.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* BUYER LOCATION */}
      {buyerLocation && (
        <p className="nearby-location">
          📍 <strong>Your Location:</strong>{" "}
          {buyerLocation}
        </p>
      )}

      {/* LOCATION INFORMATION */}
      {coordinates && (
        <div
          style={{
            margin: "15px auto",
            padding: "15px",
            maxWidth: "500px",
            background: "#ffffff",
            color: "#111111",
            borderRadius: "10px",
            border: "2px solid #2e7d32",
            textAlign: "left",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#111111",
            }}
          >
            📍 Location Information
          </h3>

          <p>
            <strong>Latitude:</strong>{" "}
            {coordinates.latitude}
          </p>

          <p>
            <strong>Longitude:</strong>{" "}
            {coordinates.longitude}
          </p>

          <p>
            <strong>Accuracy:</strong>{" "}
            {coordinates.accuracy === 0
              ? "Manual selection"
              : `${Math.round(
                  coordinates.accuracy
                )} meters`}
          </p>
        </div>
      )}

      {/* MESSAGE */}
      {message && (
        <p className="nearby-message">
          {message}
        </p>
      )}

      {/* PRODUCTS */}
      {products.length > 0 && (
        <div className="nearby-products-grid">
          {products.map((product) => (
            <div
              className="nearby-product-card"
              key={product._id}
            >
              <h2>{product.name}</h2>

              <p className="product-description">
                {product.description}
              </p>

              <p>
                <strong>Category:</strong>{" "}
                {product.category}
              </p>

              <p className="nearby-price">
                ₹{product.pricePerKg} / kg
              </p>

              <p>
                <strong>Available:</strong>{" "}
                {product.quantityAvailable}{" "}
                {product.unit}
              </p>

              <p>
                <strong>Farmer:</strong>{" "}
                {product.farmer?.name || "Unknown"}
              </p>

              {product.farmerLocation && (
                <p>
                  <strong>Farmer Location:</strong>{" "}
                  {product.farmerLocation}
                </p>
              )}

              <p className="distance">
                📍 {product.distanceInKm} km away
              </p>

              <button
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
      )}
    </div>
  );
}

export default NearbyProducts;