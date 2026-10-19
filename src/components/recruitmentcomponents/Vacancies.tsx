import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getJson, patchJson } from "../../api";
import AppHeader from "../AppHeader";
import StatusBadge from "../StatusBadge";
import Countdown from "./Countdown";

interface VacancyRow {
  vacancy_id: number;
  title: string;
  department_name: string;
  openings: number;
  closing_date: string | null;
  status: string;
  applications: number;
  hired: number;
}
interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
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

export default function Vacancies() {
  const role = localStorage.getItem("role");
  const isHR = role === "HR";
  const navigate = useNavigate();
  const location = useLocation();

  const [rows, setRows] = useState<VacancyRow[]>([]);
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
    getJson<unknown>("/departments")
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: Department[] }).data
            : [];
        setDepartments(list as Department[]);
      })
      .catch(() => setError("Could not load departments."));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      getJson<{ data: VacancyRow[]; meta: Meta }>(
        `/recruitment/vacancies${qs({
          search,
          status,
          department_id: departmentId,
          page: String(page),
          limit: "10",
        })}`
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

  async function changeStatus(v: VacancyRow, newStatus: "Open" | "Closed") {
    setError("");
    setMessage("");
    try {
      const res = await patchJson<{ message: string }>(
        `/recruitment/vacancies/${v.vacancy_id}/status`,
        { status: newStatus }
      );
      setMessage(res.message);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const headerLinks =
    role === "HR"
      ? [
          { to: "/manage", label: "HR management" },
          { to: "/employees", label: "Employees" },
          { to: "/profile", label: "My profile" },
        ]
      : [
          { to: "/dashboard", label: "Dashboard" },
          { to: "/profile", label: "My profile" },
        ];

  return (
    <>
      <AppHeader links={headerLinks} />
      <div className="dashboard">
        <h1 className="page-title">Recruitment</h1>
        <p className="page-subtitle">Job vacancies and their applications.</p>

        {isHR && (
          <div className="filters">
            <button className="small-button" onClick={() => navigate("/recruitment/new")}>
              Add vacancy
            </button>
          </div>
        )}

        <div className="filters">
          <label htmlFor="vacSearch">Search</label>
          <input
            id="vacSearch"
            placeholder="Job title"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <label htmlFor="vacDept">Department</label>
          <select
            id="vacDept"
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
          <label htmlFor="vacStatus">Status</label>
          <select
            id="vacStatus"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
            <option value="Filled">Filled</option>
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
                <th>Job title</th>
                <th>Department</th>
                <th>Hired / openings</th>
                <th>Applications</th>
                <th>Closing date</th>
                <th>Time left</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.vacancy_id}>
                  <td>
                    <div className="person-name">
                      <Link to={`/recruitment/${v.vacancy_id}`}>{v.title}</Link>
                    </div>
                  </td>
                  <td>{v.department_name}</td>
                  <td>
                    {v.hired} / {v.openings}
                  </td>
                  <td>{v.applications}</td>
                  <td className="nowrap">{v.closing_date || ""}</td>
                  <td className="nowrap">
                    <Countdown closingDate={v.closing_date} active={v.status === "Open"} />
                  </td>
                  <td>
                    <StatusBadge status={v.status} />
                  </td>
                  <td className="actions">
                    <button
                      className="small-button secondary"
                      onClick={() => navigate(`/recruitment/${v.vacancy_id}`)}
                    >
                      View
                    </button>
                    {isHR && (
                      <>
                        <button
                          className="small-button secondary"
                          onClick={() => navigate(`/recruitment/${v.vacancy_id}/edit`)}
                        >
                          Edit
                        </button>
                        {v.status === "Open" ? (
                          <button
                            className="small-button danger"
                            onClick={() => changeStatus(v, "Closed")}
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            className="small-button approve"
                            onClick={() => changeStatus(v, "Open")}
                          >
                            Reopen
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="muted">Loading...</p>}
          {!loading && rows.length === 0 && <p className="empty">No vacancies found.</p>}
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
            Page {meta.page} of {meta.pages || 1} ({meta.total} vacancies)
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