import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getJson } from "../../api";
import AppHeader from "../AppHeader";
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

const CHANGE_LABELS: Record<string, string> = {
  
  created: "Record created",
  updated: "Details updated",
  status_changed: "Status changed",
  password_changed: "Password changed by the employee",
  salary_set: "Basic salary set",
  component_assigned: "Pay component assigned",
  component_ended: "Pay component ended",
};

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isHR = localStorage.getItem("role") === "HR";
  const [emp, setEmp] = useState<Employee | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState("");
  const message = (location.state as { message?: string } | null)?.message ?? "";

  useEffect(() => {
    getJson<{ data: Employee }>(`/employees/${id}`)
      .then((res) => setEmp(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"));

    if (isHR) {
      getJson<{ data: HistoryEntry[] }>(`/employees/${id}/history`)
        .then((res) => setHistory(res.data))
        .catch(() => {});
    }
  }, [id, isHR]);

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

  return (
    <>
      <AppHeader
        links={[
          { to: "/employees", label: "Back to employees" },
          { to: "/profile", label: "My profile" },
        ]}
      />
      <div className="dashboard">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        {emp && (
          <>
            <h1 className="page-title">{emp.full_name}</h1>
            <p className="page-subtitle">
              <StatusBadge status={emp.status} />
              {emp.status_reason && emp.status !== "Active" && (
                <span className="muted"> Reason: {emp.status_reason}</span>
              )}
            </p>

            {isHR && (
              <div className="filters">
                <button
                  className="small-button"
                  onClick={() => navigate(`/employees/${emp.employee_id}/edit`)}
                >
                  Edit employee
                </button>
              </div>
            )}

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

            {isHR && (
              <section>
                <h2>History</h2>
                <p className="muted">
                  Changes made through the employee pages. Edits made directly in the database
                  are not recorded.
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
    </>
  );
}