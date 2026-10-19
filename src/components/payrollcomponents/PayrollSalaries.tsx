import { Fragment, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getJson, postJson } from "../../api";
import AppHeader from "../AppHeader";
import { isMoney, localToday, money, payrollLinks } from "./Formats";

interface Row {
  employee_id: number;
  employee_code: string | null;
  full_name: string;
  department_name: string;
  job_title: string | null;
  basic_salary: number | null;
  components: number;
}
interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
  missing_total: number;
}

function qs(params: Record<string, string>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return parts.length ? "?" + parts.join("&") : "";
}

export default function PayrollSalaries() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, pages: 0, missing_total: 0 });
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ amount: "", effectiveFrom: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getJson<{ data: Row[]; meta: Meta }>(
        `/payroll/salaries${qs({
          search,
          missing: missingOnly ? "1" : "",
          page: String(page),
          limit: "20",
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
  }, [search, missingOnly, page, reload]);

  function startEdit(r: Row) {
    setError("");
    setMessage("");
    setEditing(r.employee_id);
    setForm({
      amount: r.basic_salary === null ? "" : String(r.basic_salary),
      effectiveFrom: localToday(),
      reason: r.basic_salary === null ? "Starting salary" : "",
    });
  }

  async function saveSalary(e: FormEvent, r: Row) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!isMoney(form.amount) || Number(form.amount) <= 0) {
      setError("Enter the basic salary as a number greater than 0, with up to 2 decimals.");
      return;
    }
    if (!form.effectiveFrom) {
      setError("Please choose the date the salary starts.");
      return;
    }

    setSaving(true);
    try {
      const res = await postJson<{ message: string }>(`/payroll/employees/${r.employee_id}/salary`, {
        basicSalary: Number(form.amount),
        effectiveFrom: form.effectiveFrom,
        reason: form.reason.trim(),
      });
      setMessage(`${res.message} for ${r.full_name}.`);
      setEditing(null);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the salary");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppHeader links={payrollLinks} />
      <div className="dashboard">
        <h1 className="page-title">Salaries</h1>
        <p className="page-subtitle">
          Basic salary for each active employee. Only HR can see this page.
        </p>

        {meta.missing_total > 0 && (
          <p className="warning">
            {meta.missing_total} active employee{meta.missing_total === 1 ? " has" : "s have"} no basic
            salary. They are left out of payroll runs until you set one.{" "}
            {!missingOnly && (
              <button className="small-button secondary" onClick={() => { setMissingOnly(true); setPage(1); }}>
                Show only these
              </button>
            )}
          </p>
        )}

        <div className="filters">
          <label htmlFor="salSearch">Search</label>
          <input
            id="salSearch"
            placeholder="Name or employee code"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <label htmlFor="salMissing">
            <input
              id="salMissing"
              type="checkbox"
              checked={missingOnly}
              onChange={(e) => {
                setMissingOnly(e.target.checked);
                setPage(1);
              }}
            />{" "}
            Only employees with no salary
          </label>
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
                <th>Department</th>
                <th>Job title</th>
                <th>Basic salary</th>
                <th>Components</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.employee_id}>
                  <tr>
                    <td>
                      <div className="person-name">{r.full_name}</div>
                      <div className="person-email">{r.employee_code ?? ""}</div>
                    </td>
                    <td>{r.department_name}</td>
                    <td>{r.job_title || ""}</td>
                    <td className="nowrap">
                      {r.basic_salary === null ? (
                        <span style={{ color: "#b91c1c", fontWeight: 600 }}>Not set</span>
                      ) : (
                        money(r.basic_salary)
                      )}
                    </td>
                    <td>{r.components}</td>
                    <td className="actions">
                      <button className="small-button" onClick={() => startEdit(r)}>
                        {r.basic_salary === null ? "Set salary" : "Change"}
                      </button>
                      <button
                        className="small-button secondary"
                        onClick={() => navigate(`/payroll/employees/${r.employee_id}`)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                  {editing === r.employee_id && (
                    <tr>
                      <td colSpan={6}>
                        <form onSubmit={(e) => saveSalary(e, r)} className="request-form">
                          <div className="form-grid">
                            <div>
                              <label htmlFor={`amt${r.employee_id}`}>Basic salary (per month)</label>
                              <input
                                id={`amt${r.employee_id}`}
                                inputMode="decimal"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`eff${r.employee_id}`}>Starts on</label>
                              <input
                                id={`eff${r.employee_id}`}
                                type="date"
                                value={form.effectiveFrom}
                                onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                              />
                              <p className="hint">
                                A future date keeps the current salary until then. Older salaries stay in
                                the history.
                              </p>
                            </div>
                            <div>
                              <label htmlFor={`why${r.employee_id}`}>Reason</label>
                              <input
                                id={`why${r.employee_id}`}
                                value={form.reason}
                                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="filters">
                            <button type="submit" className="submit" disabled={saving}>
                              {saving ? "Saving..." : "Save salary"}
                            </button>
                            <button
                              type="button"
                              className="small-button secondary"
                              onClick={() => setEditing(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {loading && <p className="muted">Loading...</p>}
          {!loading && rows.length === 0 && <p className="empty">No employees found.</p>}
        </section>

        <div className="filters">
          <button className="small-button secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
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