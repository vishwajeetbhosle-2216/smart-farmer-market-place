import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  return (
    <div className="home-page">

      {/* =========================
          HERO SECTION
      ========================= */}
      <section className="home-hero">

        <div className="hero-content">

          <div className="hero-badge">
            🌱 Smart Farming Marketplace
          </div>

          <h1>
            Buy Fresh.
            <br />
            <span>Sell Direct.</span>
          </h1>

          <p>
            Connect directly with local farmers and buy fresh farm products
            at fair prices — without unnecessary middlemen.
          </p>

          <div className="hero-buttons">

            <Link
              to="/marketplace"
              className="hero-btn primary-btn"
            >
              🛒 Explore Marketplace
            </Link>

            <Link
              to="/register"
              className="hero-btn secondary-btn"
            >
              👨‍🌾 Join as Farmer
            </Link>

          </div>

        </div>


        {/* HERO VISUAL */}

        <div className="hero-visual">

          <div className="farm-circle">
            🌾
          </div>

          <div className="floating-card card-one">
            🥕 Fresh Vegetables
          </div>

          <div className="floating-card card-two">
            📍 Local Farmers
          </div>

          <div className="floating-card card-three">
            💰 Fair Prices
          </div>

        </div>

      </section>


      {/* =========================
          FEATURES SECTION
      ========================= */}

      <section className="home-features">

        <div className="section-heading">

          <h2>
            Why Smart Farmer Marketplace?
          </h2>

          <p>
            Making agricultural trade easier, smarter and more transparent.
          </p>

        </div>


        <div className="features-grid">

          <div className="feature-card">

            <div className="feature-icon">
              👨‍🌾
            </div>

            <h3>
              Direct from Farmers
            </h3>

            <p>
              Buy products directly from farmers and help them get better
              value for their produce.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              📍
            </div>

            <h3>
              Nearby Products
            </h3>

            <p>
              Find fresh products from farmers located near you using
              location-based search.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              💰
            </div>

            <h3>
              Compare Prices
            </h3>

            <p>
              Compare prices from nearby farmers and choose the best deal
              before placing your order.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              🤖
            </div>

            <h3>
              Smart Price Assistant
            </h3>

            <p>
              Ask questions about product prices, availability and nearby
              sellers using our smart price assistant.
            </p>

          </div>

        </div>

      </section>


      {/* =========================
          HOW IT WORKS
      ========================= */}

      <section className="how-section">

        <div className="section-heading">

          <h2>
            How It Works
          </h2>

          <p>
            Simple steps for farmers and buyers.
          </p>

        </div>


        <div className="steps-grid">

          <div className="step-card">

            <div className="step-number">
              1
            </div>

            <h3>
              Register
            </h3>

            <p>
              Create an account as a farmer or buyer.
            </p>

          </div>


          <div className="step-card">

            <div className="step-number">
              2
            </div>

            <h3>
              Discover
            </h3>

            <p>
              Find fresh products and nearby farmers.
            </p>

          </div>


          <div className="step-card">

            <div className="step-number">
              3
            </div>

            <h3>
              Compare
            </h3>

            <p>
              Compare prices and select the best product.
            </p>

          </div>


          <div className="step-card">

            <div className="step-number">
              4
            </div>

            <h3>
              Order
            </h3>

            <p>
              Place your order and collect your fresh produce.
            </p>

          </div>

        </div>

      </section>


      {/* =========================
          CTA SECTION
      ========================= */}

      <section className="home-cta">

        <h2>
          Ready to Connect with Local Farmers?
        </h2>

        <p>
          Discover fresh products and fair prices in your local area.
        </p>

        <Link
          to="/marketplace"
          className="cta-button"
        >
          Visit Marketplace →
        </Link>

      </section>


      {/* =========================
          FOOTER
      ========================= */}

      <footer className="home-footer">

        <div className="footer-content">

          {/* BRAND */}

          <div className="footer-brand">

            <h2>
              🌱 Smart Farmer
            </h2>

            <p>
              Connecting farmers directly with buyers through
              technology and smart agriculture.
            </p>

          </div>


          {/* QUICK LINKS */}

          <div className="footer-links">

            <h3>
              Quick Links
            </h3>

            <Link to="/">
              Home
            </Link>

            <Link to="/marketplace">
              Marketplace
            </Link>

            <Link to="/register">
              Register
            </Link>

            <Link to="/login">
              Login
            </Link>

          </div>


          {/* FEATURES */}

          <div className="footer-features">

            <h3>
              Features
            </h3>

            <p>
              📍 Nearby Products
            </p>

            <p>
              💰 Price Comparison
            </p>

            <p>
              🤖 Price Assistant
            </p>

            <p>
              🛒 Easy Ordering
            </p>

          </div>

        </div>


        {/* FOOTER BOTTOM */}

        <div className="footer-bottom">

          <p>
            © 2026 Smart Farmer Marketplace. All Rights Reserved.
          </p>

          <p>
            Built with ❤️ for Farmers & Buyers 
          </p>

        </div>

      </footer>

    </div>
  );
}

export default Home;