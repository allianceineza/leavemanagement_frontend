import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { deleteJson, getJson, postJson } from "../../api";
import AppHeader from "../AppHeader";
import StatusBadge from "../StatusBadge";
import { MONTHS, money, payrollLinks } from "./Formats";

interface Payslip {
  payslip_id: number;
  employee_name: string;
  employee_code: string | null;
  department_name: string | null;
  basic_salary: number;
  total_allowances: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
}
interface Skipped {
  employee_id: number;
  full_name: string;
  employee_code: string | null;
}
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
  paid_at: string | null;
  paid_by_name: string | null;
  skipped: Skipped[];
  payslips: Payslip[];
}

export default function PayrollRunDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    (location.state as { message?: string } | null)?.message ?? ""
  );

  const load = useCallback(async () => {
    try {
      const res = await getJson<{ data: Run }>(`/payroll/runs/${id}`);
      setRun(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function calculate() {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await postJson<{ message: string }>(`/payroll/runs/${id}/calculate`, {});
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not calculate the run");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!run) return;
    setError("");
    setMessage("");
    const label = `${MONTHS[run.period_month - 1]} ${run.period_year}`;
    const skippedNote =
      run.skipped.length > 0
        ? `\n\n${run.skipped.length} active employee(s) have no salary and are NOT included.`
        : "";
    if (
      !window.confirm(
        `Approve payroll for ${label}?\n\n${run.employee_count} payslip(s), total net pay ${money(run.total_net)}.${skippedNote}\n\nAn approved run is locked and cannot be changed or deleted. Employees will see their payslips.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await postJson<{ message: string }>(`/payroll/runs/${id}/approve`, {});
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve the run");
    } finally {
      setBusy(false);
    }
  }

  async function removeDraft() {
    setError("");
    setMessage("");
    if (!window.confirm("Delete this draft payroll run? Its calculated payslips will be removed.")) return;
    setBusy(true);
    try {
      await deleteJson<{ message: string }>(`/payroll/runs/${id}`);
      navigate("/payroll/runs", { state: { message: "Draft payroll run deleted." } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the run");
      setBusy(false);
    }
  }

  async function markPaid() {
    if (!run) return;
    setError("");
    setMessage("");
    const label = `${MONTHS[run.period_month - 1]} ${run.period_year}`;
    if (
      !window.confirm(
        `Mark payroll for ${label} as PAID?\n\nEmployees will see their payslips as paid. Do this after the money has actually been sent.`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await postJson<{ message: string }>(`/payroll/runs/${id}/mark-paid`, {});
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark the run as paid");
    } finally {
      setBusy(false);
    }
  }

  const isDraft = run?.status === "Draft";

  return (
    <>
      <AppHeader links={payrollLinks} />
      <div className="dashboard">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        {run && (
          <>
            <h1 className="page-title">
              Payroll for {MONTHS[run.period_month - 1]} {run.period_year}{" "}
              <StatusBadge status={run.status} />
            </h1>
            <p className="page-subtitle">
              Created by {run.created_by_name ?? "unknown"}
              {run.approved_at
                ? `. Approved by ${run.approved_by_name ?? "unknown"} on ${String(run.approved_at).slice(0, 16)}.`
                : "."}
            </p>

            {isDraft && (
              <div className="filters">
                <button className="small-button" onClick={calculate} disabled={busy}>
                  {run.employee_count > 0 ? "Recalculate" : "Calculate payslips"}
                </button>
                <button
                  className="small-button approve"
                  onClick={approve}
                  disabled={busy || run.employee_count === 0}
                >
                  Approve payroll
                </button>
                <button className="small-button danger" onClick={removeDraft} disabled={busy}>
                  Delete draft
                </button>
              </div>
            )}
            {isDraft && run.employee_count === 0 && (
              <p className="muted">
                Nothing is calculated yet. Click "Calculate payslips" to generate them from current
                salaries and components.
              </p>
            )}
            {!isDraft && (
              <>
                <p className="muted">This run is approved and locked. It cannot be changed or deleted.</p>
                {run.paid_at ? (
                  <p className="success">
                    Paid on {String(run.paid_at).slice(0, 16)} (marked by {run.paid_by_name ?? "unknown"}).
                  </p>
                ) : (
                  <div className="filters">
                    <button className="small-button approve" onClick={markPaid} disabled={busy}>
                      Mark as paid
                    </button>
                    <span className="muted">Employees see "Pending" until you mark this month as paid.</span>
                  </div>
                )}
              </>
            )}

            {isDraft && run.skipped.length > 0 && (
              <p className="warning">
                {run.skipped.length} active employee{run.skipped.length === 1 ? " has" : "s have"} no
                basic salary and will <strong>not</strong> be paid in this run:{" "}
                {run.skipped
                  .slice(0, 8)
                  .map((s) => s.full_name)
                  .join(", ")}
                {run.skipped.length > 8 ? ` and ${run.skipped.length - 8} more` : ""}.{" "}
                <Link to="/payroll/salaries">Set salaries</Link>, then recalculate.
              </p>
            )}

            <div className="stats">
              <div className="stat">
                <div className="stat-value">{run.employee_count}</div>
                <div className="stat-label">Payslips</div>
              </div>
              <div className="stat">
                <div className="stat-value">{money(run.total_gross)}</div>
                <div className="stat-label">Total gross pay</div>
              </div>
              <div className="stat">
                <div className="stat-value">{money(run.total_deductions)}</div>
                <div className="stat-label">Total deductions</div>
              </div>
              <div className="stat">
                <div className="stat-value">{money(run.total_net)}</div>
                <div className="stat-label">Total net pay</div>
              </div>
            </div>

            <section>
              <h2>Payslips</h2>
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Basic salary</th>
                    <th>Allowances</th>
                    <th>Gross pay</th>
                    <th>Deductions</th>
                    <th>Net pay</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {run.payslips.map((p) => (
                    <tr key={p.payslip_id}>
                      <td>
                        <div className="person-name">{p.employee_name}</div>
                        <div className="person-email">{p.employee_code ?? ""}</div>
                      </td>
                      <td>{p.department_name ?? ""}</td>
                      <td>{money(p.basic_salary)}</td>
                      <td>{money(p.total_allowances)}</td>
                      <td>{money(p.gross_pay)}</td>
                      <td>{money(p.total_deductions)}</td>
                      <td>
                        <strong>{money(p.net_pay)}</strong>
                      </td>
                      <td className="actions">
                        <button
                          className="small-button secondary"
                          onClick={() => navigate(`/payroll/payslips/${p.payslip_id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {run.payslips.length === 0 && <p className="empty">No payslips yet.</p>}
            </section>
          </>
        )}
      </div>
    </>
  );
}