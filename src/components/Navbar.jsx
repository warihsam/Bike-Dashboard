import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

// ============================================================
// PARTNER LOGOS
// ============================================================
import logoInka from "../assets/logo-inka-persero.png";
import logoSmkn1Jenangan from "../assets/logo-smkn1-jenangan.png";

export default function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <nav className="navbar">

      {/* ==================================================
          LEFT
      ================================================== */}
      <div className="navbar-left">

        <div className="navbar-logo">
          <img
            src="/imagess.png"
            alt="Bike Dashboard"
          />
        </div>

        <div className="navbar-brand">
          <h2>BIKE DASHBOARD</h2>
          <span>Component Management System</span>
        </div>

      </div>


      {/* ==================================================
          PARTNER LOGOS
      ================================================== */}
      <div className="navbar-partners">

        {/* PT INKA */}
        <div className="navbar-partner navbar-partner-inka">
          <img
            src={logoInka}
            alt="PT INKA"
          />
        </div>

        {/* SMKN 1 JENANGAN */}
        <div className="navbar-partner navbar-partner-smkn">
          <img
            src={logoSmkn1Jenangan}
            alt="SMKN 1 Jenangan"
          />
        </div>

      </div>


      {/* ==================================================
          RIGHT
      ================================================== */}
      <div className="navbar-right">

        <div className="navbar-user">

          <div className="user-avatar">
            {(user?.email?.[0] || "U").toUpperCase()}
          </div>

          <div className="user-info">
            <strong>
              {user?.email || "User"}
            </strong>

            <span>
              Administrator
            </span>
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