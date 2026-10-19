import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { deleteJson, getJson, patchJson, postJson } from "../../api";

type Tab = "types" | "departments" | "log";

interface TabProps {
  onError: (message: string) => void;
  onMessage: (message: string) => void;
}

interface LeaveTypeRow {
  leave_type_id: number;
  type_name: string;
  days_allowed_per_year: number;
  is_paid: number;
  requires_document: number;
  auto_approve: number;
  max_backdate_days: number;
  requests: number;
}
interface DepartmentRow {
  department_id: number;
  department_name: string;
  employees: number;
  vacancies: number;
}
interface ChangeRow {
  id: number;
  action: string;
  entity: string;
  entity_id: number | null;
  details: string | null;
  created_at: string;
  changed_by: string | null;
}

interface TypeForm {
  name: string;
  days: string;
  isPaid: boolean;
  requiresDocument: boolean;
  autoApprove: boolean;
  maxBackdate: string;
  applyToBalances: boolean;
}

const emptyForm: TypeForm = {
  name: "",
  days: "0",
  isPaid: true,
  requiresDocument: false,
  autoApprove: false,
  maxBackdate: "0",
  applyToBalances: false,
};

function yesNo(value: number): string {
  return Number(value) === 1 ? "Yes" : "No";
}

/* ---------- leave types ---------- */

function LeaveTypesTab({ onError, onMessage }: TabProps) {
  const [rows, setRows] = useState<LeaveTypeRow[]>([]);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<TypeForm>(emptyForm);
  const [originalDays, setOriginalDays] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getJson<{ data: LeaveTypeRow[] }>("/settings/leave-types");
      setRows(res.data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load leave types");
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  function startAdd() {
    onError("");
    onMessage("");
    setForm(emptyForm);
    setOriginalDays(null);
    setEditing("new");
  }

  function startEdit(row: LeaveTypeRow) {
    onError("");
    onMessage("");
    setForm({
      name: row.type_name,
      days: String(row.days_allowed_per_year),
      isPaid: Number(row.is_paid) === 1,
      requiresDocument: Number(row.requires_document) === 1,
      autoApprove: Number(row.auto_approve) === 1,
      maxBackdate: String(row.max_backdate_days),
      applyToBalances: false,
    });
    setOriginalDays(Number(row.days_allowed_per_year));
    setEditing(row.leave_type_id);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    onError("");
    onMessage("");
    const payload = {
      name: form.name.trim(),
      daysAllowed: Number(form.days),
      isPaid: form.isPaid,
      requiresDocument: form.requiresDocument,
      autoApprove: form.autoApprove,
      maxBackdateDays: Number(form.maxBackdate),
      applyToBalances: form.applyToBalances,
    };
    try {
      const res =
        editing === "new"
          ? await postJson<{ message: string }>("/settings/leave-types", payload)
          : await patchJson<{ message: string }>(`/settings/leave-types/${editing}`, payload);
      onMessage(res.message);
      setEditing(null);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function remove(row: LeaveTypeRow) {
    onError("");
    onMessage("");
    if (!window.confirm(`Delete the leave type "${row.type_name}"?`)) return;
    try {
      const res = await deleteJson<{ message: string }>(`/settings/leave-types/${row.leave_type_id}`);
      onMessage(res.message);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not delete");
    }
  }

  const daysChanged = editing !== "new" && originalDays !== null && Number(form.days) !== originalDays;

  return (
    <>
      {editing !== null && (
        <section>
          <h2>{editing === "new" ? "Add a leave type" : "Edit leave type"}</h2>
          <form onSubmit={submit} className="settings-form">
            <div className="form-grid">
              <div>
                <label htmlFor="ltName">Name</label>
                <input
                  id="ltName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="ltDays">Days per year</label>
                <input
                  id="ltDays"
                  type="number"
                  min={0}
                  max={365}
                  value={form.days}
                  onChange={(e) => setForm({ ...form, days: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="ltBack">Back-dating allowed (days)</label>
                <input
                  id="ltBack"
                  type="number"
                  min={0}
                  max={365}
                  value={form.maxBackdate}
                  onChange={(e) => setForm({ ...form, maxBackdate: e.target.value })}
                />
                <p className="hint">0 means the leave cannot start in the past.</p>
              </div>
            </div>

            <div className="check-row">
              <input
                id="ltPaid"
                type="checkbox"
                checked={form.isPaid}
                onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
              />
              <label htmlFor="ltPaid">Paid leave</label>
            </div>
            <div className="check-row">
              <input
                id="ltDoc"
                type="checkbox"
                checked={form.requiresDocument}
                onChange={(e) =>
                  setForm({
                    ...form,
                    requiresDocument: e.target.checked,
                    autoApprove: e.target.checked ? form.autoApprove : false,
                  })
                }
              />
              <label htmlFor="ltDoc">Requires a supporting document</label>
            </div>
            <div className="check-row">
              <input
                id="ltAuto"
                type="checkbox"
                checked={form.autoApprove}
                disabled={!form.requiresDocument}
                onChange={(e) => setForm({ ...form, autoApprove: e.target.checked })}
              />
              <label htmlFor="ltAuto">Approve automatically when the document is attached</label>
            </div>
            {daysChanged && (
              <div className="check-row">
                <input
                  id="ltApply"
                  type="checkbox"
                  checked={form.applyToBalances}
                  onChange={(e) => setForm({ ...form, applyToBalances: e.target.checked })}
                />
                <label htmlFor="ltApply">
                  Also change this year's balances by the same difference (days already used are kept)
                </label>
              </div>
            )}

            <div className="filters" style={{ marginTop: 18 }}>
              <button type="submit" className="small-button">
                Save
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
        </section>
      )}

      <section>
        <div className="filters">
          <h2 style={{ margin: 0, flex: 1 }}>Leave types</h2>
          <button className="small-button" onClick={startAdd}>
            Add leave type
          </button>
        </div>
        <p className="muted">
          Changes to days per year apply to balances created from now on. Tick the option when
          editing to change this year's balances as well.
        </p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Days per year</th>
              <th>Paid</th>
              <th>Needs document</th>
              <th>Auto approve</th>
              <th>Back-dating (days)</th>
              <th>Requests</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.leave_type_id}>
                <td className="person-name">{r.type_name}</td>
                <td>{r.days_allowed_per_year}</td>
                <td>{yesNo(r.is_paid)}</td>
                <td>{yesNo(r.requires_document)}</td>
                <td>{yesNo(r.auto_approve)}</td>
                <td>{r.max_backdate_days}</td>
                <td>{r.requests}</td>
                <td className="actions">
                  <button className="small-button secondary" onClick={() => startEdit(r)}>
                    Edit
                  </button>
                  {r.type_name !== "Annual" && r.requests === 0 && (
                    <button className="small-button danger" onClick={() => remove(r)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No leave types yet.</p>}
      </section>
    </>
  );
}

/* ---------- departments ---------- */

function DepartmentsTab({ onError, onMessage }: TabProps) {
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getJson<{ data: DepartmentRow[] }>("/settings/departments");
      setRows(res.data);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load departments");
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    onError("");
    onMessage("");
    if (!newName.trim()) {
      onError("Please type the department name.");
      return;
    }
    try {
      const res = await postJson<{ message: string }>("/settings/departments", {
        name: newName.trim(),
      });
      onMessage(res.message);
      setNewName("");
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add the department");
    }
  }

  async function rename(row: DepartmentRow) {
    onError("");
    onMessage("");
    const answer = window.prompt("New name for this department:", row.department_name);
    if (answer === null) return;
    try {
      const res = await patchJson<{ message: string }>(
        `/settings/departments/${row.department_id}`,
        { name: answer.trim() }
      );
      onMessage(res.message);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not rename the department");
    }
  }

  async function remove(row: DepartmentRow) {
    onError("");
    onMessage("");
    if (!window.confirm(`Delete the department "${row.department_name}"?`)) return;
    try {
      const res = await deleteJson<{ message: string }>(
        `/settings/departments/${row.department_id}`
      );
      onMessage(res.message);
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not delete the department");
    }
  }

  return (
    <section>
      <h2>Departments</h2>
      <form onSubmit={add} className="filters">
        <label htmlFor="newDept">New department</label>
        <input
          id="newDept"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Department name"
        />
        <button type="submit" className="small-button">
          Add
        </button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Department</th>
            <th>Employees</th>
            <th>Vacancies</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.department_id}>
              <td className="person-name">{r.department_name}</td>
              <td>{r.employees}</td>
              <td>{r.vacancies}</td>
              <td className="actions">
                <button className="small-button secondary" onClick={() => rename(r)}>
                  Rename
                </button>
                {r.employees === 0 && r.vacancies === 0 && (
                  <button className="small-button danger" onClick={() => remove(r)}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="empty">No departments yet.</p>}
    </section>
  );
}

/* ---------- change log ---------- */

const ACTION_LABELS: Record<string, string> = {
  created: "Added",
  updated: "Changed",
  deleted: "Deleted",
};
const ENTITY_LABELS: Record<string, string> = {
  leave_type: "Leave type",
  department: "Department",
};

function ChangeLogTab({ onError }: TabProps) {
  const [rows, setRows] = useState<ChangeRow[]>([]);

  useEffect(() => {
    getJson<{ data: ChangeRow[] }>("/settings/changes")
      .then((res) => setRows(res.data))
      .catch((err) => onError(err instanceof Error ? err.message : "Could not load the change log"));
  }, [onError]);

  function parse(details: string | null): {
    name?: string;
    changes?: { field: string; from: string; to: string }[];
  } {
    if (!details) return {};
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  }

  return (
    <section>
      <h2>Change log</h2>
      <p className="muted">The last 50 changes to leave types and departments.</p>
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>What</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = parse(r.details);
            return (
              <tr key={r.id}>
                <td>{r.created_at}</td>
                <td>{r.changed_by || ""}</td>
                <td>
                  {ACTION_LABELS[r.action] ?? r.action} {ENTITY_LABELS[r.entity] ?? r.entity}
                  {d.name ? `: ${d.name}` : ""}
                </td>
                <td>
                  {(d.changes ?? []).map((c) => (
                    <div key={c.field}>
                      <strong>{c.field}:</strong> {c.from ? `${c.from} to ` : ""}
                      {c.to}
                    </div>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="empty">No changes recorded yet.</p>}
    </section>
  );
}

/* ---------- page ---------- */

export default function Settings() {
  const [tab, setTab] = useState<Tab>("types");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const tabs: { id: Tab; label: string }[] = [
    { id: "types", label: "Leave types" },
    { id: "departments", label: "Departments" },
    { id: "log", label: "Change log" },
  ];

  function switchTab(next: Tab) {
    setTab(next);
    setError("");
    setMessage("");
  }

  return (
    <div className="dashboard">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">
        Manage leave types and departments. Every change is recorded in the change log.
      </p>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "tab active" : "tab"}
            onClick={() => switchTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="success">{message}</p>}

      {tab === "types" && <LeaveTypesTab onError={setError} onMessage={setMessage} />}
      {tab === "departments" && <DepartmentsTab onError={setError} onMessage={setMessage} />}
      {tab === "log" && <ChangeLogTab onError={setError} onMessage={setMessage} />}
    </div>
  );
}