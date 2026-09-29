import { useState } from "react";
import "./PriceAssistant.css";

function PriceAssistant() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const askAssistant = () => {
    if (!question.trim()) {
      setMessage("Please enter a question.");
      return;
    }

    if (!navigator.geolocation) {
      setMessage(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLoading(true);
    setAnswer("");
    setProducts([]);
    setMessage("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
          setMessage(
            "Checking nearby marketplace prices..."
          );

          const response = await fetch(
            "http://https://smart-farmer-api-g7q.onrender.com/api/price-assistant/ask",
            {
              method: "POST",

              headers: {
                "Content-Type": "application/json",
              },

              body: JSON.stringify({
                question: question.trim(),
                latitude,
                longitude,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            setMessage(
              data.message ||
                "Unable to get an answer."
            );
            return;
          }

          setAnswer(data.answer || "");
          setProducts(data.products || []);

          // Clear the question after successful response
          setQuestion("");

          setMessage("");
        } catch (error) {
          console.error(
            "Price assistant error:",
            error
          );

          setMessage(
            "Unable to connect to the server."
          );
        } finally {
          setLoading(false);
        }
      },

      (error) => {
        console.error(
          "Location error:",
          error
        );

        setLoading(false);

        if (error.code === 1) {
          setMessage(
            "Location permission is required."
          );
        } else if (error.code === 2) {
          setMessage(
            "Unable to determine your location."
          );
        } else if (error.code === 3) {
          setMessage(
            "Location request timed out."
          );
        } else {
          setMessage(
            "Unable to get your location."
          );
        }
      }
    );
  };

  return (
    <div className="price-assistant-page">
      <div className="price-assistant-container">

        <div className="price-assistant-header">
          <div className="assistant-icon">
            🤖
          </div>

          <div>
            <h1>Smart Price Assistant</h1>

            <p>
              Ask me about prices, farmers,
              availability and nearby products.
            </p>
          </div>
        </div>

        <div className="chat-area">

          {question && (
            <div className="chat-message user-message">
              <div className="message-label">
                You
              </div>

              <div className="message-content">
                {question}
              </div>
            </div>
          )}

          {loading && (
            <div className="chat-message assistant-message">
              <div className="message-label">
                🤖 Assistant
              </div>

              <div className="message-content">
                Checking nearby marketplace data...
              </div>
            </div>
          )}

          {answer && !loading && (
            <div className="chat-message assistant-message">
              <div className="message-label">
                🤖 Assistant
              </div>

              <div className="message-content">
                {answer}
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div className="marketplace-data">

              <h2>
                Nearby Marketplace Data
              </h2>

              {products.map(
                (product, index) => (
                  <div
                    className="marketplace-product"
                    key={`${product.name}-${index}`}
                  >
                    <h3>
                      {product.name}
                    </h3>

                    <p>
                      💰 Price: ₹
                      {product.pricePerKg} / kg
                    </p>

                    <p>
                      👨‍🌾 Farmer:{" "}
                      {product.farmer}
                    </p>

                    <p>
                      📦 Available:{" "}
                      {product.quantityAvailable}{" "}
                      {product.unit}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

        </div>

        {message && (
          <div className="assistant-status">
            {message}
          </div>
        )}

        <div className="question-area">

          <input
            type="text"
            placeholder="Ask something like: What is the cheapest potato?"
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                askAssistant();
              }
            }}
          />

          <button
            onClick={askAssistant}
            disabled={loading}
          >
            {loading
              ? "Checking..."
              : "Ask Assistant"}
          </button>

        </div>

        <div className="example-questions">
          <p>Try asking:</p>

          <button
            onClick={() =>
              setQuestion(
                "What is the price of potato?"
              )
            }
          >
            Price of potato
          </button>

          <button
            onClick={() =>
              setQuestion(
                "What is the cheapest potato?"
              )
            }
          >
            Cheapest potato
          </button>

          <button
            onClick={() =>
              setQuestion(
                "Which farmer sells potato?"
              )
            }
          >
            Potato farmers
          </button>

          <button
            onClick={() =>
              setQuestion(
                "How much potato is available?"
              )
            }
          >
            Potato availability
          </button>
        </div>

      </div>
    </div>
  );
}

export default PriceAssistant;