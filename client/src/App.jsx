
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Common Pages
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Farmer Pages
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import AddProduct from "./pages/farmer/AddProduct";
import MyProducts from "./pages/farmer/MyProducts";
import FarmerOrders from "./pages/farmer/FarmerOrders";
import FarmerEarnings from "./pages/farmer/FarmerEarnings";

// Buyer Pages
import Cart from "./pages/buyer/Cart";
import NearbyProducts from "./pages/buyer/NearbyProducts";
import MyOrders from "./pages/buyer/MyOrders";
import PriceComparison from "./pages/buyer/PriceComparison";
import PriceAssistant from "./pages/buyer/PriceAssistant";

// Marketplace / Product
import Marketplace from "./pages/Marketplace";
import ProductDetails from "./pages/ProductDetails";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* PUBLIC ROUTES */}

        <Route path="/" element={<Home />} />

        <Route path="/register" element={<Register />} />

        <Route path="/login" element={<Login />} />

        <Route path="/marketplace" element={<Marketplace />} />

        <Route path="/product/:id" element={<ProductDetails />} />

        {/* BUYER CART */}

        <Route
          path="/buyer/cart"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <Cart />
            </ProtectedRoute>
          }
        />

        {/* FARMER ROUTES */}

        <Route
          path="/farmer/dashboard"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/farmer/add-product"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <AddProduct />
            </ProtectedRoute>
          }
        />

        {/* FARMER PRODUCTS - SUPPORT BOTH PATHS */}

<Route
  path="/farmer/products"
  element={
    <ProtectedRoute allowedRoles={["farmer"]}>
      <MyProducts />
    </ProtectedRoute>
  }
/>

<Route
  path="/farmer/my-products"
  element={
    <ProtectedRoute allowedRoles={["farmer"]}>
      <MyProducts />
    </ProtectedRoute>
  }
/>

        <Route
          path="/farmer/orders"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/farmer/earnings"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerEarnings />
            </ProtectedRoute>
          }
        />

        {/* BUYER ROUTES */}

        <Route
          path="/buyer/nearby-products"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <NearbyProducts />
            </ProtectedRoute>
          }
        />

        {/* My Orders - supports both paths */}

        <Route
          path="/buyer/my-orders"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <MyOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/orders"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <MyOrders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/price-comparison"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <PriceComparison />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/price-assistant"
          element={
            <ProtectedRoute allowedRoles={["buyer"]}>
              <PriceAssistant />
            </ProtectedRoute>
          }
        />

        {/* ADMIN ROUTES */}

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;