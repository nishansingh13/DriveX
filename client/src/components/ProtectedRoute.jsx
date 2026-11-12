// client/src/components/ProtectedRoute.jsx
// Shows the page only to logged-in users (and only to admins if adminOnly).
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar, { Logo } from "./Navbar";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  // While the saved login is checked, show an empty top bar instead of a blank page.
  if (loading) return <header className="navbar"><Logo /></header>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return (
    <>
      <Navbar />
      <main className="page">{children}</main>
    </>
  );
}
