const {
  getPriceAssistantResponse,
} = require("../services/priceAssistantService");

const askPriceAssistant = async (req, res) => {
  try {
    const {
      question,
      latitude,
      longitude,
    } = req.body;

    if (!question) {
      return res.status(400).json({
        message: "Question is required.",
      });
    }

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        message:
          "Latitude and longitude are required.",
      });
    }

    const result =
      await getPriceAssistantResponse(
        question,
        latitude,
        longitude
      );

    res.status(200).json(result);
  } catch (error) {
    console.error(
      "Price assistant error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to process your question.",
    });
  }
};

module.exports = {
  askPriceAssistant,
};