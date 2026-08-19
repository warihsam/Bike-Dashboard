import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-logo">
          <img src="/imagess.png" alt="Navbar Logo" />
        </div>

        <div>
          <h2>BIKE DASHBOARD</h2>
          <span>Component Management System</span>
        </div>
      </div>

      <div className="navbar-right">
        <div className="navbar-user">
          <div className="user-avatar">
            {(user?.email?.[0] || "U").toUpperCase()}
          </div>

          <div className="user-info">
            <strong>{user?.email || "User"}</strong>
            <span>Administrator</span>
          </div>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}