const express = require("express");

const {
  askPriceAssistant,
} = require("../controllers/priceAssistantController");

const router = express.Router();

router.post("/ask", askPriceAssistant);

module.exports = router;