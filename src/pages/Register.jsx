import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabase";

function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ============================================================
  // REGISTER
  // ============================================================

  const handleRegister = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      // ========================================================
      // VALIDASI
      // ========================================================

      const cleanName = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanName) {
        throw new Error("Nama lengkap wajib diisi.");
      }

      if (!cleanEmail) {
        throw new Error("Email wajib diisi.");
      }

      if (password.length < 6) {
        throw new Error("Password minimal 6 karakter.");
      }

      // ========================================================
      // REGISTER SUPABASE AUTH
      // ========================================================

      console.log("========================================");
      console.log("REGISTER USER");
      console.log("EMAIL:", cleanEmail);
      console.log("NAMA:", cleanName);
      console.log("========================================");

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });

      // ========================================================
      // AUTH ERROR
      // ========================================================

      if (authError) {
        console.error("SUPABASE AUTH ERROR:", authError);
        throw authError;
      }

      // ========================================================
      // CEK USER
      // ========================================================

      const user = authData?.user;

      if (!user) {
        throw new Error("Registrasi gagal. User tidak berhasil dibuat.");
      }

      console.log("AUTH USER BERHASIL:", user);
      console.log("USER ID:", user.id);
      console.log("USER EMAIL:", user.email);

      // ========================================================
      // SIMPAN PROFILE
      // ========================================================

      const profileData = {
        id: user.id,
        full_name: cleanName,
        email: String(cleanEmail),
        role: "user",
        status: "pending",
      };

      console.log("PROFILE DATA:", profileData);

      // Lakukan upsert tanpa memanggil .select().single() secara bersamaan 
      // untuk menghindari kegagalan policy SELECT pada RLS
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" });

      // ========================================================
      // PROFILE ERROR
      // ========================================================

      if (profileError) {
        console.error("========================================");
        console.error("PROFILE INSERT ERROR", profileError);
        console.error("========================================");

        throw new Error(
          `Gagal menyimpan profil pengguna: ${profileError.message}`
        );
      }

      console.log("PROFILE BERHASIL DISIMPAN");

      // ========================================================
      // JANGAN BIARKAN USER MASUK DASHBOARD
      // ========================================================

      if (authData?.session) {
        console.log("SESSION TERBENTUK.");
        console.log("USER AKAN DI-LOGOUT KARENA MENUNGGU APPROVAL ADMIN.");
        await supabase.auth.signOut();
      }

      // ========================================================
      // RESET FORM
      // ========================================================

      setPassword("");
      setFullName("");
      setEmail("");

      // ========================================================
      // PESAN SUKSES
      // ========================================================

      setMessage(
        "Registrasi berhasil. Akun Anda sedang menunggu persetujuan admin. Silakan tunggu sampai akun disetujui sebelum login."
      );
    } catch (error) {
      console.error("========================================");
      console.error("REGISTER ERROR", error);
      console.error("========================================");

      setErrorMessage(
        error?.message || "Registrasi gagal. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* ======================================================
            LOGO
        ====================================================== */}
        <div className="auth-logo">
          <img src="/imagess.png" alt="Auth Logo" />
        </div>

        {/* ======================================================
            TITLE
        ====================================================== */}
        <h1>Buat Akun</h1>
        <p className="subtitle">Daftar untuk mengakses Bike Dashboard</p>

        {/* ======================================================
            FORM
        ====================================================== */}
        <form onSubmit={handleRegister}>
          {/* ====================================================
              NAMA LENGKAP
          ==================================================== */}
          <label>Nama Lengkap</label>
          <input
            type="text"
            placeholder="Nama lengkap"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setErrorMessage("");
              setMessage("");
            }}
            disabled={loading}
            autoComplete="name"
            required
          />

          {/* ====================================================
              EMAIL
          ==================================================== */}
          <label>Email</label>
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrorMessage("");
              setMessage("");
            }}
            disabled={loading}
            autoComplete="email"
            required
          />

          {/* ====================================================
              PASSWORD
          ==================================================== */}
          <label>Password</label>
          <input
            type="password"
            placeholder="Minimal 6 karakter"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrorMessage("");
              setMessage("");
            }}
            minLength={6}
            disabled={loading}
            autoComplete="new-password"
            required
          />

          {/* ====================================================
              ERROR MESSAGE
          ==================================================== */}
          {errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}

          {/* ====================================================
              SUCCESS MESSAGE
          ==================================================== */}
          <div className="register-success">
  <div className="register-success-icon">
    ✓
  </div>

  <div className="register-success-content">
    <h3>Registrasi Berhasil</h3>

    <p>
      Akun Anda sedang menunggu persetujuan admin
      atau Silakan Hubungi 0895-2408-5083.
    </p>
  </div>
</div>
          {/* ====================================================
              REGISTER BUTTON
          ==================================================== */}
          <button
            className="auth-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Mendaftarkan..." : "REGISTER"}
          </button>
        </form>

        {/* ======================================================
            LOGIN LINK
        ====================================================== */}
        <p className="auth-bottom">
          Sudah punya akun? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;