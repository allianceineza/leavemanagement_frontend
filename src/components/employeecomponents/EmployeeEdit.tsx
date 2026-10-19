import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJson, putJson } from "../../api";
import AppHeader from "../AppHeader";

interface Department {
  department_id: number;
  department_name: string;
}
interface ManagerOption {
  employee_id: number;
  full_name: string;
}
interface EmployeeData {
  full_name: string;
  email: string;
  phone: string | null;
  national_id: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  department_id: number;
  job_title: string | null;
  hire_date: string;
  manager_id: number | null;
}

export default function EmployeeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [form, setForm] = useState({
    fullName: "", email: "", departmentId: "", jobTitle: "", hireDate: "",
    managerId: "", phone: "", nationalId: "", gender: "", dateOfBirth: "", address: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getJson<Department[]>("/departments").then(setDepartments).catch(() => {});
    getJson<{ data: ManagerOption[] }>("/employees?status=Active&limit=100")
      .then((res) => setManagers(res.data.filter((m) => String(m.employee_id) !== id)))
      .catch(() => {});
    getJson<{ data: EmployeeData }>(`/employees/${id}`)
      .then(({ data: e }) => {
        setForm({
          fullName: e.full_name,
          email: e.email,
          departmentId: String(e.department_id),
          jobTitle: e.job_title ?? "",
          hireDate: e.hire_date,
          managerId: e.manager_id ? String(e.manager_id) : "",
          phone: e.phone ?? "",
          nationalId: e.national_id ?? "",
          gender: e.gender ?? "",
          dateOfBirth: e.date_of_birth ?? "",
          address: e.address ?? "",
        });
        setLoaded(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the employee"));
  }, [id]);

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
    if (form.phone && !/^[0-9+\-\s()]{7,30}$/.test(form.phone.trim())) {
      setError("The phone number is not valid.");
      return;
    }

    setLoading(true);
    try {
      const res = await putJson<{ message: string }>(`/employees/${id}`, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        departmentId: form.departmentId,
        jobTitle: form.jobTitle.trim(),
        hireDate: form.hireDate,
        managerId: form.managerId,
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        address: form.address.trim(),
      });
      navigate(`/employees/${id}`, { state: { message: res.message } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the changes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppHeader links={[{ to: `/employees/${id}`, label: "Back to details" }]} />
      <div className="page">
        <form className="card wide" onSubmit={handleSubmit}>
          <h1>Edit employee</h1>
          {error && <p className="error" role="alert">{error}</p>}

          {loaded && (
            <>
              <div className="form-grid">
                <div>
                  <label htmlFor="fullName">Full name <span className="required" aria-hidden="true">*</span></label>
                  <input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="email">Email <span className="required" aria-hidden="true">*</span></label>
                  <input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
                  <p className="hint">This is also the employee's login email.</p>
                </div>
                <div>
                  <label htmlFor="department">Department <span className="required" aria-hidden="true">*</span></label>
                  <select id="department" value={form.departmentId} onChange={(e) => update("departmentId", e.target.value)}>
                    {departments.map((d) => (
                      <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="jobTitle">Job title</label>
                  <input id="jobTitle" value={form.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="hireDate">Hire date <span className="required" aria-hidden="true">*</span></label>
                  <input id="hireDate" type="date" value={form.hireDate} onChange={(e) => update("hireDate", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="manager">Manager / supervisor</label>
                  <select id="manager" value={form.managerId} onChange={(e) => update("managerId", e.target.value)}>
                    <option value="">None</option>
                    {managers.map((m) => (
                      <option key={m.employee_id} value={m.employee_id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="nationalId">National ID</label>
                  <input id="nationalId" value={form.nationalId} onChange={(e) => update("nationalId", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="gender">Gender</label>
                  <select id="gender" value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                    <option value="">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dateOfBirth">Date of birth</label>
                  <input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="address">Address</label>
                  <input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
                </div>
              </div>

              <button type="submit" className="submit" disabled={loading}>
                {loading ? "Saving..." : "Save changes"}
              </button>
            </>
          )}
        </form>
      </div>
    </>
  );
}