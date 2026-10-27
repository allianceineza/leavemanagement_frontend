import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getJson, patchJson, postJson } from "../../api";
import StatusBadge from "../StatusBadge";

interface Employee {
  employee_id: number;
  employee_code: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  national_id?: string | null;
  gender: string | null;
  date_of_birth?: string | null;
  address: string | null;
  department_name: string;
  job_title: string | null;
  hire_date: string;
  manager_name: string | null;
  status: string;
  status_reason: string | null;
  role: string | null;
}
interface HistoryEntry {
  id: number;
  change_type: string;
  changed_at: string;
  changed_by: string;
  changes: { field: string; from: string; to: string }[];
}
interface AwardRow {
  award_id: number;
  award_date: string;
  reason: string;
  award_name: string;
}

const CHANGE_LABELS: Record<string, string> = {
  created: "Record created",
  updated: "Details updated",
  status_changed: "Status changed",
  role_changed: "Login role changed",
  password_reset: "Password reset",
  password_changed: "Password changed by the employee",
  salary_set: "Basic salary set",
  component_assigned: "Pay component assigned",
  component_ended: "Pay component ended",
  award_given: "Award given",
  award_removed: "Award removed",
};

function makePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isHR = localStorage.getItem("role") === "HR";

  const [emp, setEmp] = useState<Employee | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [roleChoice, setRoleChoice] = useState("Employee");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    (location.state as { message?: string } | null)?.message ?? ""
  );

  const load = useCallback(async () => {
    try {
      const res = await getJson<{ data: Employee }>(`/employees/${id}`);
      setEmp(res.data);
      setRoleChoice(res.data.role === "Manager" ? "Manager" : "Employee");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return;
    }
    if (isHR) {
      try {
        const h = await getJson<{ data: HistoryEntry[] }>(`/employees/${id}/history`);
        setHistory(h.data);
      } catch {
        // History is optional; the page still works without it
      }
    }
  }, [id, isHR]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getJson<{ data: AwardRow[] }>(`/awards?employee_id=${id}&limit=100`)
      .then((res) => setAwards(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAwards([]));
  }, [id]);

  async function changeRole() {
    if (!emp) return;
    setError("");
    setMessage("");
    if (roleChoice === emp.role) {
      setMessage("No changes");
      return;
    }
    if (!window.confirm(`Change ${emp.full_name}'s login role to ${roleChoice}?`)) return;
    try {
      const res = await patchJson<{ message: string }>(`/employees/${emp.employee_id}/role`, {
        role: roleChoice,
      });
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the role");
    }
  }

  async function resetPassword() {
    if (!emp) return;
    setError("");
    setMessage("");
    if (newPassword.length < 8) {
      setError("The new password must be at least 8 characters.");
      return;
    }
    if (!window.confirm(`Reset ${emp.full_name}'s password? Their old password will stop working.`)) {
      return;
    }
    try {
      const res = await postJson<{ message: string }>(
        `/employees/${emp.employee_id}/reset-password`,
        { password: newPassword }
      );
      setMessage(res.message);
      setNewPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password");
    }
  }

  const rows: [string, string | null | undefined][] = emp
    ? [
        ["Employee code", emp.employee_code],
        ["Email", emp.email],
        ["Phone", emp.phone],
        ["Department", emp.department_name],
        ["Job title", emp.job_title],
        ["Hire date", emp.hire_date],
        ["Manager", emp.manager_name],
        ["Login role", emp.role],
        ["Gender", emp.gender],
        ["Date of birth", emp.date_of_birth],
        ["National ID", emp.national_id],
        ["Address", emp.address],
      ]
    : [];

  const canManageLogin = emp?.role === "Employee" || emp?.role === "Manager";

  return (
    <div className="dashboard">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="success">{message}</p>}

      {emp && (
        <>
          <div className="filters">
            <button className="small-button secondary" onClick={() => navigate("/employees")}>
              Back to employees
            </button>
            {isHR && (
              <button
                className="small-button"
                onClick={() => navigate(`/employees/${emp.employee_id}/edit`)}
              >
                Edit employee
              </button>
            )}
          </div>

          <h1 className="page-title">{emp.full_name}</h1>
          <p className="page-subtitle">
            <StatusBadge status={emp.status} />
            {emp.status_reason && emp.status !== "Active" && (
              <span className="muted"> Reason: {emp.status_reason}</span>
            )}
          </p>

          <section>
            <table>
              <tbody>
                {rows
                  .filter(([, value]) => value !== undefined)
                  .map(([label, value]) => (
                    <tr key={label}>
                      <th>{label}</th>
                      <td>{value || ""}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Awards ({awards.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Award</th>
                  <th>Date</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {awards.map((a) => (
                  <tr key={a.award_id}>
                    <td>
                      <strong>{a.award_name}</strong>
                    </td>
                    <td className="nowrap">{String(a.award_date).slice(0, 10)}</td>
                    <td style={{ whiteSpace: "pre-wrap" }}>{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {awards.length === 0 && <p className="empty">No awards yet.</p>}
          </section>

          {isHR && (
            <section>
              <h2>Login account</h2>
              {canManageLogin ? (
                <>
                  <p className="muted">
                    Role changes take effect immediately. The person sees their new menu the next
                    time they log in. HR and Chief accounts are created with a registration code.
                  </p>
                  <div className="filters">
                    <label htmlFor="roleChoice">Login role</label>
                    <select
                      id="roleChoice"
                      value={roleChoice}
                      onChange={(e) => setRoleChoice(e.target.value)}
                    >
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                    </select>
                    <button className="small-button" onClick={changeRole}>
                      Change role
                    </button>
                  </div>

                  <div className="filters">
                    <label htmlFor="newPassword">New temporary password</label>
                    <input
                      id="newPassword"
                      value={newPassword}
                      autoComplete="off"
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      className="small-button secondary"
                      onClick={() => setNewPassword(makePassword())}
                    >
                      Generate
                    </button>
                    <button className="small-button danger" onClick={resetPassword}>
                      Reset password
                    </button>
                  </div>
                  <p className="hint">
                    At least 8 characters. Share it with the employee yourself. Their old password
                    stops working straight away.
                  </p>
                </>
              ) : (
                <p className="muted">
                  {emp.role
                    ? "The role and password of HR and Chief accounts cannot be changed here."
                    : "This employee has no login account."}
                </p>
              )}
            </section>
          )}

          {isHR && (
            <section>
              <h2>History</h2>
              <p className="muted">
                Changes made through the employee pages. Edits made directly in the database are
                not recorded.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>What</th>
                    <th>Changed by</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{h.changed_at}</td>
                      <td>{CHANGE_LABELS[h.change_type] ?? h.change_type}</td>
                      <td>{h.changed_by}</td>
                      <td>
                        {h.changes.map((c) => (
                          <div key={c.field}>
                            <strong>{c.field}:</strong> {c.from} → {c.to}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && <p className="empty">No changes recorded yet.</p>}
            </section>
          )}
        </>
      )}
    </div>
  );
}