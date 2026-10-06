import { useEffect, useState } from "react";
import { getJson, postJson, downloadFile, openFile } from "../api";
import AppHeader from "../components/AppHeader";
import StatusBadge from "../components/StatusBadge";

type Tab = "overview" | "pending" | "onleave" | "requests" | "analytics" | "employees";

interface Summary {
  pending: number;
  on_leave_today: number;
  starting_next_30_days: number;
  active_employees: number;
  approved_days_this_year: number;
  without_balances: number;
}
interface PendingRequest {
  request_id: number;
  full_name: string;
  email: string;
  department_name: string;
  type_name: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason: string | null;
}
interface LeaveRow {
  full_name: string;
  email: string;
  department_name: string;
  type_name: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  reason: string | null;
}
interface RequestRow extends LeaveRow {
  request_id: number;
  status: string;
  decided_by: string | null;
  decision_comment: string | null;
  has_document: number;
}
interface Analytics {
  year: number;
  byType: { type_name: string; days: number; requests: number }[];
  byDepartment: { department_name: string; employees: number; days: number }[];
  byMonth: { month: number; days: number }[];
  byStatus: { status: string; total: number }[];
}
interface EmployeeRow {
  employee_id: number;
  full_name: string;
  email: string;
  department_name: string;
  status: string;
  role: string | null;
  annual_remaining: number | null;
  on_leave_today: boolean;
}
interface Department {
  department_id: number;
  department_name: string;
}
interface LeaveType {
  leave_type_id: number;
  type_name: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function qs(params: Record<string, string>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return parts.length ? "?" + parts.join("&") : "";
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Person({ name, email }: { name: string; email: string }) {
  return (
    <>
      <div className="person-name">{name}</div>
      <div className="person-email">{email}</div>
    </>
  );
}

export default function ManageDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [summary, setSummary] = useState<Summary | null>(null);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [range, setRange] = useState({ from: localToday(), to: localToday() });
  const [onLeave, setOnLeave] = useState<LeaveRow[]>([]);
  const [filters, setFilters] = useState({
    status: "",
    from: "",
    to: "",
    departmentId: "",
    leaveTypeId: "",
  });
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balanceForm, setBalanceForm] = useState({
    year: String(new Date().getFullYear() + 1),
    carryOverMax: "0",
  });

  async function run(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const loadOnLeave = () =>
    run(async () => setOnLeave(await getJson<LeaveRow[]>(`/manage/on-leave${qs(range)}`)));
  const loadRequests = () =>
    run(async () => setRequests(await getJson<RequestRow[]>(`/manage/requests${qs(filters)}`)));
  const loadAnalytics = () =>
    run(async () => setAnalytics(await getJson<Analytics>(`/manage/analytics${qs({ year })}`)));

  useEffect(() => {
    run(async () => {
      setDepartments(await getJson<Department[]>("/departments"));
      setTypes(await getJson<LeaveType[]>("/leave/types"));
    });
  }, []);

  useEffect(() => {
    setMessage("");
    if (tab === "overview") run(async () => setSummary(await getJson<Summary>("/manage/summary")));
    if (tab === "pending") run(async () => setPending(await getJson<PendingRequest[]>("/leave/pending")));
    if (tab === "onleave") loadOnLeave();
    if (tab === "requests") loadRequests();
    if (tab === "analytics") loadAnalytics();
    if (tab === "employees") run(async () => setEmployees(await getJson<EmployeeRow[]>("/manage/employees")));
  }, [tab]);

  async function decide(id: number, decision: "Approved" | "Rejected") {
    let comment = "";
    if (decision === "Rejected") {
      const answer = window.prompt("Reason for rejecting (the employee will see this):");
      if (answer === null) return;
      comment = answer.trim();
      if (comment.length < 3) {
        setError("Please give a reason for the rejection (at least 3 characters).");
        return;
      }
    }
    await run(async () => {
      const res = await postJson<{ message: string }>(`/leave/requests/${id}/decision`, {
        decision,
        comment,
      });
      setMessage(res.message);
      setPending(await getJson<PendingRequest[]>("/leave/pending"));
    });
  }

  function download(path: string, filename: string) {
    run(() => downloadFile(path, filename));
  }

  async function generateBalances() {
    if (!window.confirm(`Create leave balances for ${balanceForm.year}? Existing balances will not change.`)) {
      return;
    }
    await run(async () => {
      const res = await postJson<{ message: string }>("/manage/balances/generate", {
        year: Number(balanceForm.year),
        carryOverMax: Number(balanceForm.carryOverMax || 0),
      });
      setMessage(res.message);
      setSummary(await getJson<Summary>("/manage/summary"));
    });
  }

  const shownEmployees = employees.filter((e) => {
    const text = search.trim().toLowerCase();
    return !text || e.full_name.toLowerCase().includes(text) || e.email.toLowerCase().includes(text);
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "pending", label: "Pending" },
    { id: "onleave", label: "On leave" },
    { id: "requests", label: "All requests" },
    { id: "analytics", label: "Analytics" },
    { id: "employees", label: "Employees" },
  ];

  return (
    <>
      <AppHeader links={[{ to: "/my-leave", label: "My own leave" }]} />

      <div className="dashboard">
        <h1 className="page-title">HR management</h1>
        <p className="page-subtitle">
          Review leave requests, see who is away, and follow leave statistics.
        </p>

        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "tab active" : "tab"}
              onClick={() => setTab(t.id)}
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

        {tab === "overview" && summary && (
          <>
            {summary.without_balances > 0 && (
              <p className="warning">
                {summary.without_balances} active employee(s) have no leave balance for this year.
                Use the form below to create them.
              </p>
            )}

            <div className="stats">
              <div className={summary.pending > 0 ? "stat stat-attention" : "stat"}>
                <div className="stat-value">{summary.pending}</div>
                <div className="stat-label">Pending requests</div>
              </div>
              <div className="stat">
                <div className="stat-value">{summary.on_leave_today}</div>
                <div className="stat-label">Employees on leave today</div>
              </div>
              <div className="stat">
                <div className="stat-value">{summary.starting_next_30_days}</div>
                <div className="stat-label">Starting leave in the next 30 days</div>
              </div>
              <div className="stat">
                <div className="stat-value">{summary.active_employees}</div>
                <div className="stat-label">Active employees</div>
              </div>
              <div className="stat">
                <div className="stat-value">{summary.approved_days_this_year}</div>
                <div className="stat-label">Approved leave days this year</div>
              </div>
            </div>

            <section>
              <h2>Create yearly leave balances</h2>
              <p className="muted">
                Gives every active employee a balance for each leave type. Balances that already
                exist are not changed, so it is safe to run twice.
              </p>
              <div className="filters">
                <label htmlFor="balYear">Year</label>
                <input id="balYear" type="number" value={balanceForm.year}
                  onChange={(e) => setBalanceForm({ ...balanceForm, year: e.target.value })} />
                <label htmlFor="balCarry">Annual days to carry over (maximum)</label>
                <input id="balCarry" type="number" min="0" value={balanceForm.carryOverMax}
                  onChange={(e) => setBalanceForm({ ...balanceForm, carryOverMax: e.target.value })} />
                <button className="small-button" onClick={generateBalances}>Create balances</button>
              </div>
            </section>
          </>
        )}

        {tab === "pending" && (
          <section>
            <h2>Pending requests</h2>
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Department</th><th>Type</th><th>From</th>
                  <th>To</th><th>Days</th><th>Reason</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.request_id}>
                    <td><Person name={r.full_name} email={r.email} /></td>
                    <td>{r.department_name}</td>
                    <td>{r.type_name}</td>
                    <td>{r.start_date}</td>
                    <td>{r.end_date}</td>
                    <td>{r.number_of_days}</td>
                    <td>{r.reason || ""}</td>
                    <td className="actions">
                      <button className="small-button approve" onClick={() => decide(r.request_id, "Approved")}>
                        Approve
                      </button>
                      <button className="small-button danger" onClick={() => decide(r.request_id, "Rejected")}>
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pending.length === 0 && <p className="empty">No pending requests.</p>}
          </section>
        )}

        {tab === "onleave" && (
          <section>
            <h2>Employees on approved leave</h2>
            <div className="filters">
              <label htmlFor="rangeFrom">From</label>
              <input id="rangeFrom" type="date" value={range.from}
                onChange={(e) => setRange({ ...range, from: e.target.value })} />
              <label htmlFor="rangeTo">To</label>
              <input id="rangeTo" type="date" value={range.to}
                onChange={(e) => setRange({ ...range, to: e.target.value })} />
              <button className="small-button" onClick={loadOnLeave}>Show</button>
              <button className="small-button secondary"
                onClick={() => download(`/manage/export/on-leave${qs(range)}`, `employees-on-leave-${range.from}-to-${range.to}.csv`)}>
                Download CSV
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Department</th><th>Type</th><th>From</th>
                  <th>To</th><th>Days</th><th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {onLeave.map((r, i) => (
                  <tr key={i}>
                    <td><Person name={r.full_name} email={r.email} /></td>
                    <td>{r.department_name}</td>
                    <td>{r.type_name}</td>
                    <td>{r.start_date}</td>
                    <td>{r.end_date}</td>
                    <td>{r.number_of_days}</td>
                    <td>{r.reason || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {onLeave.length === 0 && <p className="empty">Nobody is on approved leave in this period.</p>}
          </section>
        )}

        {tab === "requests" && (
          <section>
            <h2>All requests</h2>
            <div className="filters">
              <label htmlFor="fStatus">Status</label>
              <select id="fStatus" value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <label htmlFor="fDept">Department</label>
              <select id="fDept" value={filters.departmentId}
                onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}>
                <option value="">All</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                ))}
              </select>
              <label htmlFor="fType">Leave type</label>
              <select id="fType" value={filters.leaveTypeId}
                onChange={(e) => setFilters({ ...filters, leaveTypeId: e.target.value })}>
                <option value="">All</option>
                {types.map((t) => (
                  <option key={t.leave_type_id} value={t.leave_type_id}>{t.type_name}</option>
                ))}
              </select>
              <label htmlFor="fFrom">From</label>
              <input id="fFrom" type="date" value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
              <label htmlFor="fTo">To</label>
              <input id="fTo" type="date" value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
              <button className="small-button" onClick={loadRequests}>Show</button>
              <button className="small-button secondary"
                onClick={() => download(`/manage/export/requests${qs(filters)}`, "leave-requests.csv")}>
                Download CSV
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Department</th><th>Type</th><th>From</th><th>To</th>
                  <th>Days</th><th>Status</th><th>Decided by</th><th>Comment</th><th>documents</th><th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.request_id}>
                    <td><Person name={r.full_name} email={r.email} /></td>
                    <td>{r.department_name}</td>
                    <td>{r.type_name}</td>
                    <td>{r.start_date}</td>
                    <td>{r.end_date}</td>
                    <td>{r.number_of_days}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{r.decided_by || ""}</td>
                    <td>{r.decision_comment || ""}</td>
                    <td>
                    {Number(r.has_document) === 1 && (
                    <button
                    className="small-button secondary"
                    onClick={() => run(() => openFile(`/leave/requests/${r.request_id}/document`))}
                    >
                     View
                    </button>
            )}
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && <p className="empty">No requests match these filters.</p>}
          </section>
        )}

        {tab === "analytics" && (
          <>
            <section>
              <h2>Analytics</h2>
              <div className="filters">
                <label htmlFor="year">Year</label>
                <input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                <button className="small-button" onClick={loadAnalytics}>Show</button>
              </div>
              <p className="muted">
                Figures count approved leave only, grouped by the year and month in which the leave starts.
              </p>
            </section>

            {analytics && (
              <>
                <section>
                  <h2>Approved days by leave type</h2>
                  <table>
                    <thead><tr><th>Leave type</th><th>Requests</th><th>Days</th><th></th></tr></thead>
                    <tbody>
                      {analytics.byType.map((r) => (
                        <tr key={r.type_name}>
                          <td>{r.type_name}</td>
                          <td>{r.requests}</td>
                          <td>{r.days}</td>
                          <td className="bar-cell"><Bar value={r.days} max={Math.max(...analytics.byType.map((x) => x.days))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section>
                  <h2>Approved days by department</h2>
                  <table>
                    <thead><tr><th>Department</th><th>Employees</th><th>Days</th><th>Days per employee</th><th></th></tr></thead>
                    <tbody>
                      {analytics.byDepartment.map((r) => (
                        <tr key={r.department_name}>
                          <td>{r.department_name}</td>
                          <td>{r.employees}</td>
                          <td>{r.days}</td>
                          <td>{r.employees ? (r.days / r.employees).toFixed(1) : "0.0"}</td>
                          <td className="bar-cell"><Bar value={r.days} max={Math.max(...analytics.byDepartment.map((x) => x.days))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section>
                  <h2>Approved days by month</h2>
                  <table>
                    <thead><tr><th>Month</th><th>Days</th><th></th></tr></thead>
                    <tbody>
                      {analytics.byMonth.map((r) => (
                        <tr key={r.month}>
                          <td>{MONTHS[r.month - 1]}</td>
                          <td>{r.days}</td>
                          <td className="bar-cell"><Bar value={r.days} max={Math.max(...analytics.byMonth.map((x) => x.days))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>

                <section>
                  <h2>Requests by status</h2>
                  <table>
                    <thead><tr><th>Status</th><th>Requests</th><th></th></tr></thead>
                    <tbody>
                      {analytics.byStatus.map((r) => (
                        <tr key={r.status}>
                          <td><StatusBadge status={r.status} /></td>
                          <td>{r.total}</td>
                          <td className="bar-cell"><Bar value={r.total} max={Math.max(...analytics.byStatus.map((x) => x.total))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {analytics.byStatus.length === 0 && <p className="empty">No requests in this year.</p>}
                </section>
              </>
            )}
          </>
        )}

        {tab === "employees" && (
          <section>
            <h2>Employees</h2>
            <div className="filters">
              <label htmlFor="search">Search by name or email</label>
              <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee</th><th>Department</th><th>Role</th><th>Status</th>
                  <th>Annual days left</th><th>On leave today</th>
                </tr>
              </thead>
              <tbody>
                {shownEmployees.map((e) => (
                  <tr key={e.employee_id}>
                    <td><Person name={e.full_name} email={e.email} /></td>
                    <td>{e.department_name}</td>
                    <td>{e.role || "No login"}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td>{e.annual_remaining === null ? "" : e.annual_remaining}</td>
                    <td>
                      {e.on_leave_today ? (
                        <span className="badge badge-onleave">On leave</span>
                      ) : (
                        <span className="muted">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shownEmployees.length === 0 && <p className="empty">No employees found.</p>}
          </section>
        )}
      </div>
    </>
  );
}