import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setErrorMessage("");

    // ============================================================
    // 1. LOGIN SUPABASE AUTH
    // ============================================================
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    // Jika login Auth gagal
    if (authError) {
      setErrorMessage(authError.message);
      setLoading(false);
      return;
    }

    // Pastikan user tersedia
    const user = authData?.user;

    if (!user) {
      setErrorMessage("Data user tidak ditemukan.");
      setLoading(false);
      return;
    }

    // ============================================================
    // 2. AMBIL DATA PROFILE USER
    // ============================================================
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role, created_at, status")
      .eq("id", user.id)
      .single();

    // Jika profile tidak ditemukan / error
    if (profileError || !profile) {
      console.error("PROFILE ERROR:", profileError);

      // Logout supaya user tidak tetap memiliki session
      await supabase.auth.signOut();

      setErrorMessage(
        "Profil akun tidak ditemukan. Silakan hubungi administrator."
      );

      setLoading(false);
      return;
    }

    // ============================================================
    // 3. CEK STATUS AKUN
    // ============================================================

    // AKUN MASIH PENDING
    if (profile.status === "pending") {
      // Logout supaya session tidak tersimpan
      await supabase.auth.signOut();

      setErrorMessage(
        "Akun Anda masih menunggu persetujuan administrator."
      );

      setLoading(false);
      return;
    }

    // ============================================================
    // 4. STATUS HARUS ACCEPTED
    // ============================================================
    if (profile.status !== "accepted") {
      // Logout jika status bukan accepted
      await supabase.auth.signOut();

      setErrorMessage(
        "Akun Anda belum diizinkan untuk mengakses dashboard."
      );

      setLoading(false);
      return;
    }

    // ============================================================
    // 5. LOGIN BERHASIL
    // ============================================================
    console.log("LOGIN BERHASIL");
    console.log("USER:", user);
    console.log("PROFILE:", profile);

    setLoading(false);

    navigate("/dashboard");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/imagess.png" alt="Auth Logo" />
        </div>

        <h1>Bike Dashboard</h1>

        <p className="subtitle">Login untuk melanjutkan</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>

          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          <button
            className="auth-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "MEMPROSES..." : "LOGIN"}
          </button>
        </form>

        <p className="auth-bottom">
          Belum punya akun?{" "}
          <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;