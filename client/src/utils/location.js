// ======================================================
// SMART FARMER - LOCATION UTILITY
// Works for Android phones + laptops/desktops
// ======================================================

const MAX_ACCEPTABLE_ACCURACY = 500; // meters


// ------------------------------------------------------
// GET DEVICE LOCATION
// ------------------------------------------------------
export const getDeviceLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        type: "UNSUPPORTED",
        message:
          "Geolocation is not supported by this device/browser.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        console.log("========== SMART FARMER LOCATION ==========");
        console.log("Latitude:", latitude);
        console.log("Longitude:", longitude);
        console.log("Accuracy:", accuracy, "meters");
        console.log("============================================");

        // Reject very inaccurate locations
        if (accuracy > MAX_ACCEPTABLE_ACCURACY) {
          reject({
            type: "LOW_ACCURACY",
            latitude,
            longitude,
            accuracy,
            message:
              `Location accuracy is too low (${Math.round(
                accuracy
              )} meters). Please try again or select your location manually.`,
          });

          return;
        }

        resolve({
          latitude,
          longitude,
          accuracy,
          source: "device",
        });
      },

      (error) => {
        console.error("Geolocation error:", error);

        if (error.code === 1) {
          reject({
            type: "PERMISSION_DENIED",
            message:
              "Location permission was denied. Please allow location access.",
          });
        } else if (error.code === 2) {
          reject({
            type: "POSITION_UNAVAILABLE",
            message:
              "Your location is currently unavailable.",
          });
        } else if (error.code === 3) {
          reject({
            type: "TIMEOUT",
            message:
              "Location request timed out. Please try again.",
          });
        } else {
          reject({
            type: "UNKNOWN",
            message:
              "Unable to determine your location.",
          });
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  });
};


// ------------------------------------------------------
// SEARCH LOCATION MANUALLY
// Uses OpenStreetMap Nominatim
// ------------------------------------------------------
export const searchLocation = async (query) => {
  if (!query || !query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: "jsonv2",
          limit: "5",
          addressdetails: "1",
          countrycodes: "in",
        })
    );

    if (!response.ok) {
      throw new Error(
        "Location search failed."
      );
    }

    const data = await response.json();

    return data.map((place) => ({
      name: place.display_name,
      latitude: Number(place.lat),
      longitude: Number(place.lon),
      source: "manual",
    }));
  } catch (error) {
    console.error(
      "Manual location search error:",
      error
    );

    throw new Error(
      "Unable to search for this location."
    );
  }
};


// ------------------------------------------------------
// CHECK LOCATION ACCURACY
// ------------------------------------------------------
export const isLocationAccurate = (accuracy) => {
  return accuracy <= MAX_ACCEPTABLE_ACCURACY;
};