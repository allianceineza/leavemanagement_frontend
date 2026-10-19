import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getJson, postJson } from "../../api";
import AppHeader from "../AppHeader";
import StatusBadge from "../StatusBadge";
import { MONTHS, money, payrollLinks } from "./Formats";

interface Run {
  run_id: number;
  period_year: number;
  period_month: number;
  status: string;
  employee_count: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  approved_at: string | null;
  created_by_name: string | null;
  approved_by_name: string | null;
}

export default function PayrollRuns() {
  const navigate = useNavigate();
  const now = new Date();
  const [runs, setRuns] = useState<Run[]>([]);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getJson<{ data: Run[] }>("/payroll/runs");
      setRuns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createRun(e: FormEvent) {
    e.preventDefault();
    setError("");

    const y = Number(year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      setError("Enter a valid year.");
      return;
    }

    setSaving(true);
    try {
      const res = await postJson<{ message: string; run_id: number }>("/payroll/runs", {
        year: y,
        month: Number(month),
      });
      navigate(`/payroll/runs/${res.run_id}`, { state: { message: res.message } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the payroll run");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppHeader links={payrollLinks} />
      <div className="dashboard">
        <h1 className="page-title">Payroll runs</h1>
        <p className="page-subtitle">
          One run per month. Calculate it, check the payslips, then approve it. An approved run is
          locked.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <section>
          <h2>Start a new run</h2>
          <form onSubmit={createRun} className="filters">
            <label htmlFor="runMonth">Month</label>
            <select id="runMonth" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <label htmlFor="runYear">Year</label>
            <input
              id="runYear"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
            <button type="submit" className="small-button" disabled={saving}>
              {saving ? "Creating..." : "Create run"}
            </button>
          </form>
        </section>

        <section>
          <h2>All runs</h2>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Status</th>
                <th>Employees</th>
                <th>Gross pay</th>
                <th>Deductions</th>
                <th>Net pay</th>
                <th>Approved</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.run_id}>
                  <td>
                    {MONTHS[r.period_month - 1]} {r.period_year}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{r.employee_count}</td>
                  <td>{money(r.total_gross)}</td>
                  <td>{money(r.total_deductions)}</td>
                  <td>
                    <strong>{money(r.total_net)}</strong>
                  </td>
                  <td>
                    {r.approved_at ? (
                      <>
                        <div className="nowrap">{String(r.approved_at).slice(0, 16)}</div>
                        <div className="person-email">{r.approved_by_name ?? ""}</div>
                      </>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="actions">
                    <button
                      className="small-button secondary"
                      onClick={() => navigate(`/payroll/runs/${r.run_id}`)}
                    >
                      {r.status === "Draft" ? "Open" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {runs.length === 0 && <p className="empty">No payroll runs yet.</p>}
        </section>
      </div>
    </>
  );
}