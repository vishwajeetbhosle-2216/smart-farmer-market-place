import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  // Not logged in
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Role is not allowed
  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    // Send user to their own dashboard
    if (user.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (user.role === "farmer") {
      return <Navigate to="/farmer/dashboard" replace />;
    }

    if (user.role === "buyer") {
      return <Navigate to="/buyer/nearby-products" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;