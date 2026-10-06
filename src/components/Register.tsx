import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getJson, postJson } from "../api";
import { BRAND } from "../branding.ts";

interface Department {
  department_id: number;
  department_name: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    departmentId: "",
    hireDate: "",
    role: "Employee",
    registrationCode: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJson<Department[]>("/departments")
      .then(setDepartments)
      .catch(() => setError("Could not load departments. Is the server running?"));
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim() || !form.email.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!form.departmentId || !form.hireDate) {
      setError("Please choose a department and a hire date.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.role !== "Employee" && !form.registrationCode.trim()) {
      setError("Manager, HR and Chief accounts need a registration code.");
      return;
    }

    setLoading(true);
    try {
      await postJson("/auth/register", {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        departmentId: Number(form.departmentId),
        hireDate: form.hireDate,
        role: form.role,
        registrationCode: form.registrationCode.trim(),
        password: form.password,
      });
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <form className="card wide" onSubmit={handleSubmit}>
        <div className="auth-brand">
          {BRAND.logo && <img src={BRAND.logo} alt={`${BRAND.shortName} logo`} />}
          <span className="org">{BRAND.organization}</span>
        </div>
        <h1>{BRAND.systemName}</h1>
        <h2>Create your account</h2>

        <div className="form-grid">
          <div>
            <label htmlFor="fullName">
              Full name <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="fullName"
              value={form.fullName}
              autoComplete="name"
              onChange={(e) => update("fullName", e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="email">
              Email <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              autoComplete="email"
              onChange={(e) => update("email", e.target.value)}
            />
            <p className="hint">You will use this email to log in.</p>
          </div>

          <div>
            <label htmlFor="department">
              Department <span className="required" aria-hidden="true">*</span>
            </label>
            <select
              id="department"
              value={form.departmentId}
              onChange={(e) => update("departmentId", e.target.value)}
            >
              <option value="">Choose a department</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="hireDate">
              Hire date <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="hireDate"
              type="date"
              value={form.hireDate}
              onChange={(e) => update("hireDate", e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
            >
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
              <option value="HR">HR</option>
              <option value="Chief">Chief</option>
            </select>
            <p className="hint">
              {form.role === "Employee"
                ? "Most staff register as Employee."
                : "A registration code from your administrator is required for this role."}
            </p>
          </div>

          {form.role !== "Employee" && (
            <div>
              <label htmlFor="registrationCode">
                Registration code <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="registrationCode"
                type="password"
                value={form.registrationCode}
                autoComplete="off"
                onChange={(e) => update("registrationCode", e.target.value)}
              />
            </div>
          )}

          <div>
            <label htmlFor="password">
              Password <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              autoComplete="new-password"
              onChange={(e) => update("password", e.target.value)}
            />
            <p className="hint">At least 8 characters.</p>
          </div>

          <div>
            <label htmlFor="confirmPassword">
              Confirm password <span className="required" aria-hidden="true">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              autoComplete="new-password"
              onChange={(e) => update("confirmPassword", e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}