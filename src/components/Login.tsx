import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { postJson } from "../api";
import { BRAND } from "../branding.ts";

interface LoginResponse {
  token: string;
  role: "Employee" | "Manager" | "HR" | "Chief";
  fullName: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const data = await postJson<LoginResponse>("/auth/login", {
        email: email.trim(),
        password,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("fullName", data.fullName);

      navigate(data.role === "HR" ? "/manage" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          {BRAND.logo && <img src={BRAND.logo} alt={`${BRAND.shortName} logo`} />}
          <span className="org">{BRAND.organization}</span>
        </div>
        <h1>{BRAND.systemName}</h1>
        <h2>Log in to your account</h2>

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <p className="hint">Forgot your password? Please contact HR.</p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="switch">
          No account yet? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  );
}