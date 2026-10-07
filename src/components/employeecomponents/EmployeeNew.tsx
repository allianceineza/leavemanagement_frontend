import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getJson, postJson } from "../../api";
import AppHeader from "../AppHeader";

interface Department {
  department_id: number;
  department_name: string;
}
interface ManagerOption {
  employee_id: number;
  full_name: string;
}

function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function makePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function EmployeeNew() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "Employee",
    departmentId: "",
    jobTitle: "",
    hireDate: localToday(),
    managerId: "",
    phone: "",
    nationalId: "",
    gender: "",
    dateOfBirth: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJson<Department[]>("/departments")
      .then(setDepartments)
      .catch(() => setError("Could not load departments."));
    getJson<{ data: ManagerOption[] }>("/employees?status=Active&limit=100")
      .then((res) => setManagers(res.data))
      .catch(() => {});
  }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim() || !form.email.trim()) {
      setError("Please enter the full name and email.");
      return;
    }
    if (!form.departmentId || !form.hireDate) {
      setError("Please choose a department and a hire date.");
      return;
    }
    if (form.password.length < 8) {
      setError("The temporary password must be at least 8 characters.");
      return;
    }
    if (form.phone && !/^[0-9+\-\s()]{7,30}$/.test(form.phone.trim())) {
      setError("The phone number is not valid.");
      return;
    }

    setLoading(true);
    try {
      const res = await postJson<{ message: string; employee_code: string }>("/employees", {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        departmentId: Number(form.departmentId),
        hireDate: form.hireDate,
        jobTitle: form.jobTitle.trim(),
        managerId: form.managerId ? Number(form.managerId) : undefined,
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        address: form.address.trim(),
      });
      navigate("/employees", {
        state: {
          message: `${form.fullName.trim()} was added (${res.employee_code}). Give them the temporary password so they can log in.`,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppHeader links={[{ to: "/employees", label: "Back to employees" }]} />

      <div className="page">
        <form className="card wide" onSubmit={handleSubmit}>
          <h1>Add employee</h1>
          <p className="muted">
            This creates the employee record, their login, and their leave balances for this year.
          </p>

          <div className="form-grid">
            <div>
              <label htmlFor="fullName">
                Full name <span className="required" aria-hidden="true">*</span>
              </label>
              <input id="fullName" value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)} />
            </div>

            <div>
              <label htmlFor="email">
                Email <span className="required" aria-hidden="true">*</span>
              </label>
              <input id="email" type="email" value={form.email}
                onChange={(e) => update("email", e.target.value)} />
              <p className="hint">The employee logs in with this email.</p>
            </div>

            <div>
              <label htmlFor="department">
                Department <span className="required" aria-hidden="true">*</span>
              </label>
              <select id="department" value={form.departmentId}
                onChange={(e) => update("departmentId", e.target.value)}>
                <option value="">Choose a department</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="jobTitle">Job title</label>
              <input id="jobTitle" value={form.jobTitle}
                onChange={(e) => update("jobTitle", e.target.value)} />
            </div>

            <div>
              <label htmlFor="hireDate">
                Hire date <span className="required" aria-hidden="true">*</span>
              </label>
              <input id="hireDate" type="date" value={form.hireDate}
                onChange={(e) => update("hireDate", e.target.value)} />
            </div>

            <div>
              <label htmlFor="manager">Manager / supervisor</label>
              <select id="manager" value={form.managerId}
                onChange={(e) => update("managerId", e.target.value)}>
                <option value="">None</option>
                {managers.map((m) => (
                  <option key={m.employee_id} value={m.employee_id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="role">Role</label>
              <select id="role" value={form.role}
                onChange={(e) => update("role", e.target.value)}>
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
              </select>
              <p className="hint">HR and Chief accounts are created with a registration code.</p>
            </div>

            <div>
              <label htmlFor="password">
                Temporary password <span className="required" aria-hidden="true">*</span>
              </label>
              <input id="password" value={form.password} autoComplete="off"
                onChange={(e) => update("password", e.target.value)} />
              <p className="hint">
                At least 8 characters. Share it with the employee yourself.{" "}
                <button type="button" className="small-button secondary"
                  onClick={() => update("password", makePassword())}>
                  Generate
                </button>
              </p>
            </div>

            <div>
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={form.phone}
                onChange={(e) => update("phone", e.target.value)} />
            </div>

            <div>
              <label htmlFor="nationalId">National ID</label>
              <input id="nationalId" value={form.nationalId}
                onChange={(e) => update("nationalId", e.target.value)} />
            </div>

            <div>
              <label htmlFor="gender">Gender</label>
              <select id="gender" value={form.gender}
                onChange={(e) => update("gender", e.target.value)}>
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="dateOfBirth">Date of birth</label>
              <input id="dateOfBirth" type="date" value={form.dateOfBirth}
                onChange={(e) => update("dateOfBirth", e.target.value)} />
            </div>

            <div>
              <label htmlFor="address">Address</label>
              <input id="address" value={form.address}
                onChange={(e) => update("address", e.target.value)} />
            </div>
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="submit" disabled={loading}>
            {loading ? "Adding employee..." : "Add employee"}
          </button>
        </form>
      </div>
    </>
  );
}