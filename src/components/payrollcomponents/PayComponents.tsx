import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getJson, postJson, putJson } from "../../api";
import AppHeader from "../AppHeader";
import { isMoney, money, payrollLinks } from "./Formats";

interface Component {
  component_id: number;
  name: string;
  type: string;
  calc_type: string;
  default_value: number;
  is_active: number;
}

const EMPTY = { id: null as number | null, name: "", type: "Allowance", calcType: "Fixed", defaultValue: "0" };

export default function PayComponents() {
  const [rows, setRows] = useState<Component[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getJson<{ data: Component[] }>("/payroll/components?all=1");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(c: Component) {
    setError("");
    setMessage("");
    setForm({
      id: c.component_id,
      name: c.name,
      type: c.type,
      calcType: c.calc_type,
      defaultValue: String(c.default_value),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Please enter a name.");
      return;
    }
    if (!isMoney(form.defaultValue)) {
      setError("The default value must be a number with up to 2 decimals.");
      return;
    }
    if (form.calcType === "Percent" && Number(form.defaultValue) > 100) {
      setError("A percent cannot be more than 100.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        type: form.type,
        calcType: form.calcType,
        defaultValue: Number(form.defaultValue),
      };
      const res = form.id
        ? await putJson<{ message: string }>(`/payroll/components/${form.id}`, body)
        : await postJson<{ message: string }>("/payroll/components", body);
      setMessage(res.message);
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the component");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Component) {
    setError("");
    setMessage("");
    if (
      Number(c.is_active) &&
      !window.confirm(
        `Deactivate "${c.name}"? It will be left out of future payroll runs. Past payslips are not changed.`
      )
    ) {
      return;
    }
    try {
      const res = await putJson<{ message: string }>(`/payroll/components/${c.component_id}`, {
        isActive: !Number(c.is_active),
      });
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the component");
    }
  }

  const valueLabel = (c: Component) =>
    c.calc_type === "Percent" ? `${c.default_value}% of basic` : money(c.default_value);

  return (
    <>
      <AppHeader links={payrollLinks} />
      <div className="dashboard">
        <h1 className="page-title">Pay components</h1>
        <p className="page-subtitle">
          Allowances add to pay and deductions take from it. Assign them to employees from the
          Salaries page.
        </p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        <section>
          <h2>{form.id ? "Edit component" : "Add a component"}</h2>
          <p className="muted">
            Enter tax, pension and similar items here as deductions, using the current official
            rates. A single percent cannot describe tax bands, so check what applies to you. A
            changed default value applies to future payroll runs only. Past payslips never change.
          </p>
          <form onSubmit={submit} className="request-form">
            <div className="form-grid">
              <div>
                <label htmlFor="pcName">Name</label>
                <input id="pcName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="pcType">Type</label>
                <select id="pcType" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="Allowance">Allowance (adds to pay)</option>
                  <option value="Deduction">Deduction (takes from pay)</option>
                </select>
              </div>
              <div>
                <label htmlFor="pcCalc">Calculated as</label>
                <select
                  id="pcCalc"
                  value={form.calcType}
                  onChange={(e) => setForm({ ...form, calcType: e.target.value })}
                >
                  <option value="Fixed">Fixed amount</option>
                  <option value="Percent">Percent of basic salary</option>
                </select>
              </div>
              <div>
                <label htmlFor="pcValue">
                  Default {form.calcType === "Percent" ? "percent" : "amount"}
                </label>
                <input
                  id="pcValue"
                  inputMode="decimal"
                  value={form.defaultValue}
                  onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
                />
                <p className="hint">Each employee can have their own value when you assign it.</p>
              </div>
            </div>
            <div className="filters">
              <button type="submit" className="submit" disabled={saving}>
                {saving ? "Saving..." : form.id ? "Save changes" : "Add component"}
              </button>
              {form.id && (
                <button type="button" className="small-button secondary" onClick={() => setForm(EMPTY)}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <h2>All components</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Default</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.component_id}>
                  <td>{c.name}</td>
                  <td>{c.type}</td>
                  <td>{valueLabel(c)}</td>
                  <td>{Number(c.is_active) ? "Active" : <span className="muted">Inactive</span>}</td>
                  <td className="actions">
                    <button className="small-button secondary" onClick={() => startEdit(c)}>
                      Edit
                    </button>
                    <button
                      className={Number(c.is_active) ? "small-button danger" : "small-button approve"}
                      onClick={() => toggleActive(c)}
                    >
                      {Number(c.is_active) ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="empty">No components yet.</p>}
        </section>
      </div>
    </>
  );
}