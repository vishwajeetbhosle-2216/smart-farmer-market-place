const Product = require("../models/product");

async function getPriceAssistantResponse(
  question,
  latitude,
  longitude
) {
  const text = String(question)
    .toLowerCase()
    .trim();

  const products = await Product.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [
            Number(longitude),
            Number(latitude),
          ],
        },
        $maxDistance: 10000,
      },
    },
  }).populate("farmer", "name");

  if (products.length === 0) {
    return {
      answer:
        "I could not find any nearby products in the marketplace.",
      products: [],
    };
  }

  const normalize = (value) =>
    String(value)
      .toLowerCase()
      .trim();

  const matchingProducts = products.filter(
    (product) => {
      const productName = normalize(product.name);
      const category = normalize(product.category);

      return (
        text.includes(productName) ||
        productName.includes(text) ||
        text.includes(category)
      );
    }
  );

  if (matchingProducts.length === 0) {
    const availableProducts = products
      .map((product) => product.name)
      .join(", ");

    return {
      answer:
        `I could not identify the product from your question. ` +
        `Nearby products include: ${availableProducts}.`,
      products: [],
    };
  }

  const prices = matchingProducts.map(
    (product) => Number(product.pricePerKg)
  );

  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);

  const averagePrice =
    prices.reduce(
      (sum, price) => sum + price,
      0
    ) / prices.length;

  const productName =
    matchingProducts[0].name;

  // Farmer / seller question
  if (
    text.includes("farmer") ||
    text.includes("seller")
  ) {
    const farmerNames =
      matchingProducts
        .map(
          (product) =>
            product.farmer?.name ||
            "Unknown farmer"
        )
        .join(", ");

    return {
      answer:
        `Nearby farmers selling ${productName}: ${farmerNames}.`,
      products: matchingProducts.map(
        (product) => ({
          name: product.name,
          pricePerKg: product.pricePerKg,
          farmer:
            product.farmer?.name ||
            "Unknown",
          quantityAvailable:
            product.quantityAvailable,
          unit: product.unit,
        })
      ),
    };
  }

  // Quantity / availability question
  if (
    text.includes("available") ||
    text.includes("quantity") ||
    text.includes("stock")
  ) {
    const totalQuantity =
      matchingProducts.reduce(
        (sum, product) =>
          sum +
          Number(
            product.quantityAvailable
          ),
        0
      );

    return {
      answer:
        `There are approximately ${totalQuantity} ${matchingProducts[0].unit} ` +
        `of ${productName} available from nearby farmers.`,
      products: matchingProducts.map(
        (product) => ({
          name: product.name,
          pricePerKg: product.pricePerKg,
          farmer:
            product.farmer?.name ||
            "Unknown",
          quantityAvailable:
            product.quantityAvailable,
          unit: product.unit,
        })
      ),
    };
  }

  // Cheapest / lowest price
  if (
    text.includes("lowest") ||
    text.includes("cheapest")
  ) {
    return {
      answer:
        `The lowest nearby price for ${productName} is ₹${lowestPrice}/kg.`,
      products: matchingProducts.map(
        (product) => ({
          name: product.name,
          pricePerKg: product.pricePerKg,
          farmer:
            product.farmer?.name ||
            "Unknown",
          quantityAvailable:
            product.quantityAvailable,
          unit: product.unit,
        })
      ),
    };
  }

  // Highest price
  if (
    text.includes("highest") ||
    text.includes("expensive")
  ) {
    return {
      answer:
        `The highest nearby price for ${productName} is ₹${highestPrice}/kg.`,
      products: matchingProducts.map(
        (product) => ({
          name: product.name,
          pricePerKg: product.pricePerKg,
          farmer:
            product.farmer?.name ||
            "Unknown",
          quantityAvailable:
            product.quantityAvailable,
          unit: product.unit,
        })
      ),
    };
  }

  // Average price
  if (
    text.includes("average") ||
    text.includes("rate")
  ) {
    return {
      answer:
        `The average nearby marketplace price for ${productName} is ₹${averagePrice.toFixed(
          2
        )}/kg.`,
      products: matchingProducts.map(
        (product) => ({
          name: product.name,
          pricePerKg: product.pricePerKg,
          farmer:
            product.farmer?.name ||
            "Unknown",
          quantityAvailable:
            product.quantityAvailable,
          unit: product.unit,
        })
      ),
    };
  }

  // Default price response
  return {
    answer:
      `Nearby ${productName} prices range from ₹${lowestPrice}/kg ` +
      `to ₹${highestPrice}/kg. The average price is ₹${averagePrice.toFixed(
        2
      )}/kg.`,
    products: matchingProducts.map(
      (product) => ({
        name: product.name,
        pricePerKg: product.pricePerKg,
        farmer:
          product.farmer?.name ||
          "Unknown",
        quantityAvailable:
          product.quantityAvailable,
        unit: product.unit,
      })
    ),
  };
}

module.exports = {
  getPriceAssistantResponse,
};