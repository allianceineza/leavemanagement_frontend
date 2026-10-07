import { useEffect, useState } from "react";
import { getJson, patchJson } from "../../api";
import AppHeader from "../AppHeader";
import StatusBadge from "../StatusBadge";
import { useLocation, useNavigate,Link } from "react-router-dom";

interface EmployeeRow {
  employee_id: number;
  employee_code: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  department_name: string;
  job_title: string | null;
  hire_date: string;
  manager_name: string | null;
  status: string;
}
interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}
interface ListResponse {
  data: EmployeeRow[];
  meta: Meta;
}
interface Department {
  department_id: number;
  department_name: string;
}

function qs(params: Record<string, string>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return parts.length ? "?" + parts.join("&") : "";
}

export default function Employees() {
  const role = localStorage.getItem("role");
  const location = useLocation();
    const navigate = useNavigate();
  const isHR = role === "HR";


  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, pages: 0 });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    (location.state as { message?: string } | null)?.message ?? ""
  );

  useEffect(() => {
    getJson<Department[]>("/departments")
      .then(setDepartments)
      .catch(() => setError("Could not load departments."));
  }, []);

  // Reload when a filter, the page, or the reload counter changes (search waits 300 ms while typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      getJson<ListResponse>(
        `/employees${qs({ search, status, department_id: departmentId, page: String(page), limit: "10" })}`
      )
        .then((res) => {
          setRows(res.data);
          setMeta(res.meta);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status, departmentId, page, reload]);

  async function changeStatus(emp: EmployeeRow, newStatus: "Active" | "Inactive" | "Terminated") {
    setMessage("");
    setError("");
    let reason = "";
    if (newStatus !== "Active") {
      const answer = window.prompt(
        `Reason for setting ${emp.full_name} to ${newStatus} (saved in the employee history):`
      );
      if (answer === null) return;
      reason = answer.trim();
      if (reason.length < 3) {
        setError("Please give a reason (at least 3 characters).");
        return;
      }
    }
    try {
      const res = await patchJson<{ message: string }>(`/employees/${emp.employee_id}/status`, {
        status: newStatus,
        reason,
      });
      setMessage(res.message);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const headerLinks = isHR
    ? [
        { to: "/manage", label: "HR management" },
        { to: "/my-leave", label: "My own leave" },
      ]
    : [{ to: "/dashboard", label: "Dashboard" }];

  return (
    <>
      <AppHeader links={headerLinks} />

      <div className="dashboard">
        <h1 className="page-title">Employees</h1>
                <p className="page-subtitle">
          {role === "Manager"
            ? "Employees in your department."
            : "Search and manage employee records."}
        </p>

        {isHR && (
          <div className="filters">
            <button className="small-button" onClick={() => navigate("/employees/new")}>
              Add employee
            </button>
          </div>
        )}
        <div className="filters">
          <label htmlFor="empSearch">Search</label>
          <input
            id="empSearch"
            placeholder="Name, email or code"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {role !== "Manager" && (
            <>
              <label htmlFor="empDept">Department</label>
              <select
                id="empDept"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </select>
            </>
          )}
          <label htmlFor="empStatus">Status</label>
          <select
            id="empStatus"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Terminated">Terminated</option>
          </select>
        </div>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        <section>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Department</th>
                <th>Job title</th>
                <th>Hire date</th>
                <th>Manager</th>
                <th>Status</th>
                {isHR && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.employee_id}>
                  <td>
                    <div className="person-name">{e.full_name}</div>
                    <div className="person-email">{e.email}</div>
                  </td>
                  <td>{e.employee_code || ""}</td>
                  <td>{e.department_name}</td>
                  <td>{e.job_title || ""}</td>
                  <td>{e.hire_date}</td>
                  <td>{e.manager_name || ""}</td>
                  <td>
                    <StatusBadge status={e.status} />
                  </td>
                  {isHR && (
                    <td className="actions">
                      {e.status === "Active" ? (
                        <>
                          <button
                            className="small-button secondary"
                            onClick={() => changeStatus(e, "Inactive")}
                          >
                            Deactivate
                          </button>
                          <button
                            className="small-button danger"
                            onClick={() => changeStatus(e, "Terminated")}
                          >
                            Terminate
                          </button>
                        </>
                      ) : (
                        <button
                          className="small-button approve"
                          onClick={() => changeStatus(e, "Active")}
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="muted">Loading...</p>}
          {!loading && rows.length === 0 && <p className="empty">No employees found.</p>}
        </section>

        <div className="filters">
          <button
            className="small-button secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="muted">
            Page {meta.page} of {meta.pages || 1} ({meta.total} employees)
          </span>
          <button
            className="small-button secondary"
            disabled={page >= meta.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}