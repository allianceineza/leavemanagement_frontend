import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import { getJson, patchJson, postJson } from "../../api";
import AppHeader from "../AppHeader";
import { isMoney, localToday, money, payrollLinks } from "./Formats";

interface Salary {
  salary_id: number;
  basic_salary: number;
  effective_from: string;
  reason: string | null;
  set_by: string | null;
}
interface Assigned {
  id: number;
  component_id: number;
  name: string;
  type: string;
  calc_type: string;
  default_value: number;
  value: number | null;
  start_date: string;
  end_date: string | null;
}
interface Detail {
  employee: { employee_id: number; full_name: string; employee_code: string | null };
  current_salary: number | null;
  salaries: Salary[];
  components: Assigned[];
}
interface Option {
  component_id: number;
  name: string;
  type: string;
  calc_type: string;
  default_value: number;
}

export default function EmployeePayroll() {
  const { id } = useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [salary, setSalary] = useState({ amount: "", effectiveFrom: localToday(), reason: "" });
  const [assign, setAssign] = useState({ componentId: "", value: "", startDate: localToday(), endDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await getJson<{ data: Detail }>(`/payroll/employees/${id}`);
      setDetail(d.data);
      const c = await getJson<{ data: Option[] }>("/payroll/components");
      setOptions(Array.isArray(c.data) ? c.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSalary(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!isMoney(salary.amount) || Number(salary.amount) <= 0) {
      setError("Enter the basic salary as a number greater than 0, with up to 2 decimals.");
      return;
    }
    setSaving(true);
    try {
      const res = await postJson<{ message: string }>(`/payroll/employees/${id}/salary`, {
        basicSalary: Number(salary.amount),
        effectiveFrom: salary.effectiveFrom,
        reason: salary.reason.trim(),
      });
      setMessage(res.message);
      setSalary({ amount: "", effectiveFrom: localToday(), reason: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the salary");
    } finally {
      setSaving(false);
    }
  }

  async function assignComponent(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!assign.componentId) {
      setError("Please choose a component.");
      return;
    }
    if (assign.value !== "" && !isMoney(assign.value)) {
      setError("The value must be a number with up to 2 decimals, or empty to use the default.");
      return;
    }
    setSaving(true);
    try {
      const res = await postJson<{ message: string }>(`/payroll/employees/${id}/components`, {
        componentId: Number(assign.componentId),
        value: assign.value === "" ? undefined : Number(assign.value),
        startDate: assign.startDate,
        endDate: assign.endDate || undefined,
      });
      setMessage(res.message);
      setAssign({ componentId: "", value: "", startDate: localToday(), endDate: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign the component");
    } finally {
      setSaving(false);
    }
  }

  async function endToday(a: Assigned) {
    setError("");
    setMessage("");
    if (!window.confirm(`Stop "${a.name}" from today? It will be left out of payroll runs after this date.`)) {
      return;
    }
    try {
      const res = await patchJson<{ message: string }>(`/payroll/assignments/${a.id}/end`, {
        endDate: localToday(),
      });
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end the component");
    }
  }

  const today = localToday();
  const basis = (a: Assigned) => {
    const rate = a.value ?? a.default_value;
    return a.calc_type === "Percent" ? `${rate}% of basic` : money(rate);
  };
  const selected = options.find((o) => String(o.component_id) === assign.componentId);

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

        {detail && (
          <>
            <h1 className="page-title">
              {detail.employee.full_name}{" "}
              <span className="muted">{detail.employee.employee_code ?? ""}</span>
            </h1>
            <p className="page-subtitle">
              Current basic salary:{" "}
              {detail.current_salary === null ? (
                <strong style={{ color: "#b91c1c" }}>Not set</strong>
              ) : (
                <strong>{money(detail.current_salary)}</strong>
              )}
            </p>

            <section>
              <h2>Basic salary</h2>
              <form onSubmit={saveSalary} className="request-form">
                <div className="form-grid">
                  <div>
                    <label htmlFor="sAmount">New basic salary (per month)</label>
                    <input
                      id="sAmount"
                      inputMode="decimal"
                      value={salary.amount}
                      onChange={(e) => setSalary({ ...salary, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="sFrom">Starts on</label>
                    <input
                      id="sFrom"
                      type="date"
                      value={salary.effectiveFrom}
                      onChange={(e) => setSalary({ ...salary, effectiveFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="sReason">Reason</label>
                    <input
                      id="sReason"
                      value={salary.reason}
                      onChange={(e) => setSalary({ ...salary, reason: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" className="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save salary"}
                </button>
              </form>

              <table>
                <thead>
                  <tr>
                    <th>Starts on</th>
                    <th>Basic salary</th>
                    <th>Reason</th>
                    <th>Set by</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.salaries.map((s) => (
                    <tr key={s.salary_id}>
                      <td className="nowrap">{String(s.effective_from).slice(0, 10)}</td>
                      <td>{money(s.basic_salary)}</td>
                      <td>{s.reason || ""}</td>
                      <td>{s.set_by || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detail.salaries.length === 0 && <p className="empty">No salary has been set yet.</p>}
            </section>

            <section>
              <h2>Allowances and deductions</h2>
              <form onSubmit={assignComponent} className="request-form">
                <div className="form-grid">
                  <div>
                    <label htmlFor="aComp">Component</label>
                    <select
                      id="aComp"
                      value={assign.componentId}
                      onChange={(e) => setAssign({ ...assign, componentId: e.target.value })}
                    >
                      <option value="">Choose a component</option>
                      {options.map((o) => (
                        <option key={o.component_id} value={o.component_id}>
                          {o.name} ({o.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="aValue">
                      Value for this employee{selected?.calc_type === "Percent" ? " (percent)" : ""}
                    </label>
                    <input
                      id="aValue"
                      inputMode="decimal"
                      placeholder={
                        selected
                          ? `Default: ${selected.calc_type === "Percent" ? selected.default_value + "%" : money(selected.default_value)}`
                          : "Uses the default"
                      }
                      value={assign.value}
                      onChange={(e) => setAssign({ ...assign, value: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="aStart">Starts on</label>
                    <input
                      id="aStart"
                      type="date"
                      value={assign.startDate}
                      onChange={(e) => setAssign({ ...assign, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="aEnd">Ends on (optional)</label>
                    <input
                      id="aEnd"
                      type="date"
                      value={assign.endDate}
                      onChange={(e) => setAssign({ ...assign, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" className="submit" disabled={saving}>
                  {saving ? "Saving..." : "Assign component"}
                </button>
              </form>

              <table>
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Type</th>
                    <th>Basis</th>
                    <th>Starts</th>
                    <th>Ends</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {detail.components.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{a.type}</td>
                      <td>{basis(a)}</td>
                      <td className="nowrap">{String(a.start_date).slice(0, 10)}</td>
                      <td className="nowrap">{a.end_date ? String(a.end_date).slice(0, 10) : "Ongoing"}</td>
                      <td className="actions">
                        {(!a.end_date || String(a.end_date).slice(0, 10) >= today) && (
                          <button className="small-button danger" onClick={() => endToday(a)}>
                            End today
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detail.components.length === 0 && <p className="empty">No allowances or deductions assigned.</p>}
            </section>
          </>
        )}
      </div>
    </>
  );
}