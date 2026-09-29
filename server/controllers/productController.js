const Product = require("../models/product");

// ==========================================
// MARK EXPIRED PRODUCTS AUTOMATICALLY
// ==========================================
const updateExpiredProducts = async () => {
  await Product.updateMany(
    {
      expiryDate: { $lte: new Date() },
      status: "Active",
    },
    {
      $set: { status: "Expired" },
    }
  );
};

// ==========================================
// ADD A NEW PRODUCT
// AUTOMATIC SHELF-LIFE MANAGEMENT
// ==========================================
const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      pricePerKg,
      quantityAvailable,
      unit,
      coordinates,
      image,
      harvestDate,
      discountPercentage,
    } = req.body;

    if (
      !name ||
      !category ||
      pricePerKg === undefined ||
      quantityAvailable === undefined ||
      !coordinates
    ) {
      return res.status(400).json({
        message: "Please provide all required product details",
      });
    }

    if (!image) {
      return res.status(400).json({
        message: "Please upload a product image",
      });
    }

    // ==========================================
    // VALIDATE HARVEST DATE
    // ==========================================

    const productHarvestDate = harvestDate
      ? new Date(harvestDate)
      : new Date();

    if (isNaN(productHarvestDate.getTime())) {
      return res.status(400).json({
        message: "Invalid harvest date",
      });
    }

    if (productHarvestDate > new Date()) {
      return res.status(400).json({
        message: "Harvest date cannot be in the future",
      });
    }

    // ==========================================
    // AUTOMATIC SHELF-LIFE RULES
    // ==========================================

    const productName = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z]/g, "");

    let shelfLifeDays = 7;

    // Leafy vegetables
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
      "curry leaves",
    ];

    const isLeafyVegetable =
      leafyVegetables.some((item) =>
        productName.includes(item)
      );

    if (isLeafyVegetable) {
      shelfLifeDays = 3;
    }

    // Flowers
    else if (category === "Flowers") {
      shelfLifeDays = 3;
    }

    // Potato
    else if (
      productName.includes("potato") ||
      productName.includes("aloo")
    ) {
      shelfLifeDays = 21;
    }

    // Tomato
    else if (
      productName.includes("tomato") ||
      productName.includes("tamatar")
    ) {
      shelfLifeDays = 14;
    }

    // ==========================================
    // CALCULATE EXPIRY DATE AUTOMATICALLY
    // ==========================================

    const productExpiryDate = new Date(
      productHarvestDate.getTime() +
        shelfLifeDays * 24 * 60 * 60 * 1000
    );

    // ==========================================
    // CREATE PRODUCT
    // ==========================================

    const product = await Product.create({
      name,
      description,
      category,
      pricePerKg,
      quantityAvailable,
      unit: unit || "kg",
      image,

      harvestDate: productHarvestDate,
      expiryDate: productExpiryDate,
      status: "Active",
      discountPercentage: Number(discountPercentage) || 0,

      farmer: req.user.userId,

      location: {
        type: "Point",
        coordinates,
      },
    });

    res.status(201).json({
      message: "Product added successfully",
      product,
      shelfLifeDays,
    });
  } catch (error) {
    console.error("Add product error:", error);

    res.status(500).json({
      message: "Failed to add product",
      error: error.message,
    });
  }
};

// ==========================================
// GET PRODUCTS OF LOGGED-IN FARMER
// ==========================================
const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      farmer: req.user.userId,
    }).sort({
      createdAt: -1,
    });

    res.json(products);
  } catch (error) {
    console.error("Get my products error:", error);

    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE MY PRODUCT
// ==========================================
const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      pricePerKg,
      quantityAvailable,
      unit,
      image,
      coordinates,
    } = req.body;

    // Find product belonging to logged-in farmer
    const product = await Product.findOne({
      _id: req.params.id,
      farmer: req.user.userId,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or you are not authorized",
      });
    }

    // Update only fields that were provided
    if (name !== undefined) {
      product.name = name;
    }

    if (description !== undefined) {
      product.description = description;
    }

    if (category !== undefined) {
      product.category = category;
    }

    if (pricePerKg !== undefined) {
      product.pricePerKg = Number(pricePerKg);
    }

    if (quantityAvailable !== undefined) {
      product.quantityAvailable = Number(quantityAvailable);
    }

    if (unit !== undefined) {
      product.unit = unit;
    }

    if (image !== undefined && image !== "") {
      product.image = image;
    }

    if (
      coordinates &&
      Array.isArray(coordinates) &&
      coordinates.length === 2
    ) {
      product.location = {
        type: "Point",
        coordinates,
      };
    }

    await product.save();

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    res.status(500).json({
      message: "Failed to update product",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE MY PRODUCT
// ==========================================
const deleteProduct = async (req, res) => {
  try {
    // Delete only if product belongs to logged-in farmer
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user.userId,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or you are not authorized",
      });
    }

    res.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    res.status(500).json({
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL ACTIVE PRODUCTS
// EXPIRED PRODUCTS ARE HIDDEN
// ==========================================
const getAllProducts = async (req, res) => {
  try {
    // Update expired product statuses
    await updateExpiredProducts();

    const products = await Product.find({
      status: "Active",
      expiryDate: { $gt: new Date() },
    })
      .populate("farmer", "name email")
      .sort({
        createdAt: -1,
      });

    res.json(products);
  } catch (error) {
    console.error("Get all products error:", error);

    res.status(500).json({
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// ==========================================
// GET PRODUCT BY ID
// ==========================================
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "farmer",
      "name email"
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(product);
  } catch (error) {
    console.error("Get product error:", error);

    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

// ==========================================
// GET NEARBY PRODUCTS
// ==========================================
const getNearbyProducts = async (req, res) => {
  try {
    // Mark expired products before searching nearby products
    await updateExpiredProducts();

    const {
      longitude,
      latitude,
      maxDistance = 30000,
    } = req.query;

    const lng = Number(longitude);
    const lat = Number(latitude);
    const distance = Number(maxDistance);

    // Validate coordinates
    if (
      !Number.isFinite(lng) ||
      !Number.isFinite(lat)
    ) {
      return res.status(400).json({
        message: "Valid longitude and latitude are required.",
      });
    }

    // Validate coordinate range
    if (
      lng < -180 ||
      lng > 180 ||
      lat < -90 ||
      lat > 90
    ) {
      return res.status(400).json({
        message: "Invalid latitude or longitude.",
      });
    }

    // Validate distance
    if (
      !Number.isFinite(distance) ||
      distance <= 0
    ) {
      return res.status(400).json({
        message: "Invalid search distance.",
      });
    }

    const products = await Product.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },

          key: "location",

          distanceField: "distanceInMeters",

          maxDistance: distance,

          spherical: true,

          // Only active and non-expired products
          query: {
            status: "Active",
            expiryDate: {
              $gt: new Date(),
            },
          },
        },
      },

      {
        $sort: {
          distanceInMeters: 1,
        },
      },
    ]);

    // Populate farmer information
    const populatedProducts =
      await Product.populate(products, {
        path: "farmer",
        select: "name email",
      });

    const productsWithDistance =
      populatedProducts.map((product) => ({
        ...product,

        distanceInKm: Number(
          (
            product.distanceInMeters / 1000
          ).toFixed(2)
        ),
      }));

    res.json(productsWithDistance);
  } catch (error) {
    console.error(
      "Get nearby products error:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch nearby products",
      error: error.message,
    });
  }
};

// ==========================================
// COMPARE PRODUCT PRICES
// LOCATION IS OPTIONAL
// ONLY ACTIVE + NON-EXPIRED PRODUCTS
// ==========================================
const comparePrices = async (req, res) => {
  try {
    // Mark expired products automatically
    await updateExpiredProducts();

    const {
      name,
      category,
      longitude,
      latitude,
      maxDistance,
    } = req.query;

    // ==========================================
    // VALIDATE PRODUCT SEARCH
    // ==========================================

    if (
      (!name || !name.trim()) &&
      (!category || !category.trim())
    ) {
      return res.status(400).json({
        message:
          "Product name or category is required",
      });
    }

    // ==========================================
    // LOCATION IS OPTIONAL
    // ==========================================

    const hasLongitude =
      longitude !== undefined &&
      longitude !== "";

    const hasLatitude =
      latitude !== undefined &&
      latitude !== "";

    if (hasLongitude !== hasLatitude) {
      return res.status(400).json({
        message:
          "Please provide both longitude and latitude, or leave both empty.",
      });
    }

    const hasLocation =
      hasLongitude && hasLatitude;

    let products = [];

    // ==========================================
    // FETCH PRODUCTS
    // ==========================================

    if (hasLocation) {
      // Location-based comparison
      // Preserve existing nearby search

      const lng = Number(longitude);
      const lat = Number(latitude);

      const distance =
        maxDistance !== undefined
          ? Number(maxDistance)
          : 10000;

      // Validate coordinates
      if (
        !Number.isFinite(lng) ||
        !Number.isFinite(lat)
      ) {
        return res.status(400).json({
          message:
            "Invalid longitude or latitude",
        });
      }

      if (
        lng < -180 ||
        lng > 180 ||
        lat < -90 ||
        lat > 90
      ) {
        return res.status(400).json({
          message:
            "Invalid longitude or latitude",
        });
      }

      // Validate distance
      if (
        !Number.isFinite(distance) ||
        distance <= 0
      ) {
        return res.status(400).json({
          message:
            "maxDistance must be greater than 0",
        });
      }

      // Find products within selected radius
      products = await Product.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [lng, lat],
            },

            key: "location",

            distanceField: "distanceInMeters",

            maxDistance: distance,

            spherical: true,

            query: {
              status: "Active",
              expiryDate: {
                $gt: new Date(),
              },
            },
          },
        },

        {
          $sort: {
            distanceInMeters: 1,
          },
        },
      ]);

      // Add distance in kilometres
      products = products.map((product) => ({
        ...product,

        distanceInKm: Number(
          (
            product.distanceInMeters / 1000
          ).toFixed(2)
        ),
      }));
    } else {
      // GPS-independent comparison
      // No coordinates or location permission required

      products = await Product.find({
        status: "Active",
        expiryDate: {
          $gt: new Date(),
        },
      }).lean();
    }

    // ==========================================
    // FILTER BY PRODUCT NAME / CATEGORY
    // ==========================================

    const searchName =
      name?.trim().toLowerCase();

    const searchCategory =
      category?.trim().toLowerCase();

    const filteredProducts =
      products.filter((product) => {
        const productName =
          product.name || "";

        const productCategory =
          product.category || "";

        const nameMatches = searchName
          ? productName
              .toLowerCase()
              .includes(searchName)
          : true;

        const categoryMatches =
          searchCategory
            ? productCategory
                .toLowerCase()
                .includes(searchCategory)
            : true;

        return (
          nameMatches &&
          categoryMatches
        );
      });

    // ==========================================
    // NO PRODUCTS FOUND
    // ==========================================

    if (filteredProducts.length === 0) {
      return res.json({
        productName: name || null,
        category: category || null,
        sellerCount: 0,
        lowestPrice: null,
        highestPrice: null,
        averagePrice: null,
        products: [],
      });
    }

    // ==========================================
    // SORT BY PRICE
    // ==========================================

    filteredProducts.sort(
      (a, b) =>
        Number(a.pricePerKg) -
        Number(b.pricePerKg)
    );

    // ==========================================
    // CALCULATE PRICE STATISTICS
    // ==========================================

    const prices =
      filteredProducts.map(
        (product) =>
          Number(product.pricePerKg)
      );

    const lowestPrice =
      Math.min(...prices);

    const highestPrice =
      Math.max(...prices);

    const averagePrice =
      prices.reduce(
        (sum, price) =>
          sum + price,
        0
      ) / prices.length;

    // ==========================================
    // POPULATE FARMER DETAILS
    // ==========================================

    const populatedProducts =
      await Product.populate(
        filteredProducts,
        {
          path: "farmer",
          select: "name email",
        }
      );

    // ==========================================
    // SEND PRICE COMPARISON
    // ==========================================

    res.json({
      productName: name || null,

      category: category || null,

      sellerCount:
        populatedProducts.length,

      lowestPrice,

      highestPrice,

      averagePrice:
        Number(
          averagePrice.toFixed(2)
        ),

      products:
        populatedProducts,
    });
  } catch (error) {
    console.error(
      "Compare prices error:",
      error
    );

    res.status(500).json({
      message:
        "Failed to compare prices",

      error:
        error.message,
    });
  }
};

// ==========================================
// EXPORT ALL CONTROLLERS
// ==========================================
module.exports = {
  addProduct,
  getMyProducts,
  updateProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  getNearbyProducts,
  comparePrices,
};