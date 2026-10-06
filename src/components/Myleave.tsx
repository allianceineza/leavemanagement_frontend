import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getJson, postForm, postJson, openFile } from "../api";
import AppHeader from "../components/AppHeader";
import StatusBadge from "../components/StatusBadge";

interface LeaveType {
  leave_type_id: number;
  type_name: string;
  requires_document: number;
  auto_approve: number;
  max_backdate_days: number;
}
interface Balance {
  leave_type_id: number;
  type_name: string;
  days_allocated: number;
  days_used: number;
  days_remaining: number;
}
interface MyRequest {
  request_id: number;
  type_name: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason: string | null;
  status: string;
  decision_comment: string | null;
  has_document: number;
}
interface Notice {
  request_id: number;
  type_name: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  status: string;
  decision_comment: string | null;
  decided_by: string | null;
}

function formatDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

// Estimate only. The server does the official count.
function countWorkingDays(start: string, end: string): number {
  const last = new Date(end + "T00:00:00");
  let count = 0;
  for (let d = new Date(start + "T00:00:00"); d <= last; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function MyLeave() {
  const fullName = localStorage.getItem("fullName") || "";
  const role = localStorage.getItem("role") || "";

  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [mine, setMine] = useState<MyRequest[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [form, setForm] = useState({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [t, b, m, n] = await Promise.all([
        getJson<LeaveType[]>("/leave/types"),
        getJson<Balance[]>("/leave/balances"),
        getJson<MyRequest[]>("/leave/my-requests"),
        getJson<Notice[]>("/leave/notifications"),
      ]);
      setTypes(t);
      setBalances(b);
      setMine(m);
      setNotices(n);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load data");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const today = formatDate(new Date());
  const selectedType = types.find((t) => String(t.leave_type_id) === form.leaveTypeId);
  const needsDocument = selectedType ? Number(selectedType.requires_document) === 1 : false;
  const autoApprove = selectedType ? Number(selectedType.auto_approve) === 1 : false;
  const minStart = selectedType ? shiftDate(today, -Number(selectedType.max_backdate_days)) : today;
  const estimate =
    form.startDate && form.endDate && form.endDate >= form.startDate
      ? countWorkingDays(form.startDate, form.endDate)
      : null;

  async function submitRequest(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!form.leaveTypeId || !form.startDate || !form.endDate) {
      setError("Choose a leave type, a start date and an end date.");
      return;
    }
    if (needsDocument && !file) {
      setError("Please attach your supporting document, for example the hospital certificate.");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setError("The file is too large. The maximum size is 5 MB.");
      return;
    }
    try {
      const body = new FormData();
      body.append("leaveTypeId", form.leaveTypeId);
      body.append("startDate", form.startDate);
      body.append("endDate", form.endDate);
      body.append("reason", form.reason.trim());
      if (file) body.append("document", file);

      const res = await postForm<{ message: string }>("/leave/requests", body);
      setMessage(res.message);
      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      setFile(null);
      setFileKey((k) => k + 1);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  async function cancelRequest(id: number) {
    setError("");
    setMessage("");
    try {
      const res = await postJson<{ message: string }>(`/leave/requests/${id}/cancel`, {});
      setMessage(res.message);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel");
    }
  }

  async function markNoticesRead() {
    const ids = notices.map((n) => n.request_id);
    try {
      await postJson("/leave/notifications/read", { ids });
      setNotices([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update notifications");
    }
  }

  async function viewDocument(id: number) {
    setError("");
    try {
      await openFile(`/leave/requests/${id}/document`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the document");
    }
  }

  const headerLinks =
    role === "HR"
      ? [{ to: "/manage", label: "Management dashboard" }]
      : role === "Manager" || role === "Chief"
        ? [{ to: "/dashboard", label: "Back to my workspace" }]
        : [];

  return (
    <>
      <AppHeader links={headerLinks} />

      <div className="dashboard">
        <h1 className="page-title">My leave</h1>
        <p className="page-subtitle">Welcome, {fullName}. Here is your leave at a glance.</p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        {notices.length > 0 && (
          <section>
            <h2>New decisions on your leave requests</h2>
            {notices.map((n) => (
              <div key={n.request_id} className={`notice notice-${n.status.toLowerCase()}`}>
                <StatusBadge status={n.status} /> <strong>{n.type_name}</strong> leave,{" "}
                {n.start_date} to {n.end_date} ({n.number_of_days} working days)
                {n.decided_by ? `, decided by ${n.decided_by}` : ""}
                {n.status === "Rejected" && n.decision_comment && (
                  <p>
                    <strong>Reason:</strong> {n.decision_comment}
                  </p>
                )}
              </div>
            ))}
            <button className="small-button secondary" onClick={markNoticesRead}>
              Mark as read
            </button>
          </section>
        )}

        <section>
          <h2>My leave balance this year</h2>
          <div className="balance-grid">
            {balances.map((b) => {
              const level =
                b.days_remaining <= 0 ? "balance-none" : b.days_remaining <= 3 ? "balance-low" : "";
              return (
                <div key={b.leave_type_id} className={`balance-card ${level}`}>
                  <div className="balance-type">{b.type_name}</div>
                  <div className="balance-remaining">
                    {b.days_remaining} <small>days left</small>
                  </div>
                  <div className="balance-meta">
                    {b.days_used} used of {b.days_allocated}
                  </div>
                  <Bar value={b.days_used} max={b.days_allocated} />
                </div>
              );
            })}
          </div>
          {balances.length === 0 && (
            <p className="empty">
              No leave balance has been set up for you this year. Please contact HR.
            </p>
          )}
        </section>

        <section>
          <h2>Request leave</h2>
          <form onSubmit={submitRequest} className="request-form">
            <div className="form-grid">
              <div className="full">
                <label htmlFor="leaveType">Leave type</label>
                <select
                  id="leaveType"
                  value={form.leaveTypeId}
                  onChange={(e) => update("leaveTypeId", e.target.value)}
                >
                  <option value="">Choose a leave type</option>
                  {types.map((t) => (
                    <option key={t.leave_type_id} value={t.leave_type_id}>
                      {t.type_name}
                    </option>
                  ))}
                </select>
                {selectedType && needsDocument && (
                  <p className="info">
                    {selectedType.type_name} leave needs a supporting document.
                    {autoApprove
                      ? " It is approved automatically when you attach it, and HR can check the document afterwards."
                      : " Your request goes to your approver together with the document."}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="startDate">Start date</label>
                <input
                  id="startDate"
                  type="date"
                  min={minStart}
                  value={form.startDate}
                  onChange={(e) => update("startDate", e.target.value)}
                />
                {selectedType && Number(selectedType.max_backdate_days) > 0 && (
                  <p className="hint">
                    You may start up to {selectedType.max_backdate_days} days in the past.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="endDate">End date</label>
                <input
                  id="endDate"
                  type="date"
                  min={form.startDate || minStart}
                  value={form.endDate}
                  onChange={(e) => update("endDate", e.target.value)}
                />
              </div>

              {needsDocument && (
                <div className="full">
                  <label htmlFor="document">Supporting document (hospital certificate)</label>
                  <input
                    key={fileKey}
                    id="document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="hint">PDF, JPG or PNG, up to 5 MB.</p>
                </div>
              )}

              <div className="full">
                <label htmlFor="reason">Reason (optional)</label>
                <input
                  id="reason"
                  value={form.reason}
                  onChange={(e) => update("reason", e.target.value)}
                />
                {estimate !== null && (
                  <p className="hint">
                    About {estimate} working day{estimate === 1 ? "" : "s"} (Monday to Friday). The
                    exact number is confirmed when you submit.
                  </p>
                )}
              </div>
            </div>

            <button type="submit" className="submit">
              Submit request
            </button>
          </form>
        </section>

        <section>
          <h2>My requests</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Status</th>
                <th>Comment</th>
                <th>Document</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mine.map((r) => (
                <tr key={r.request_id}>
                  <td>{r.type_name}</td>
                  <td>{r.start_date}</td>
                  <td>{r.end_date}</td>
                  <td>{r.number_of_days}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{r.decision_comment || ""}</td>
                  <td>
                    {Number(r.has_document) === 1 && (
                      <button
                        className="small-button secondary"
                        onClick={() => viewDocument(r.request_id)}
                      >
                        View
                      </button>
                    )}
                  </td>
                  <td className="actions">
                    {r.status === "Pending" && (
                      <button
                        className="small-button danger"
                        onClick={() => cancelRequest(r.request_id)}
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {mine.length === 0 && <p className="empty">You have not requested any leave yet.</p>}
        </section>
      </div>
    </>
  );
}