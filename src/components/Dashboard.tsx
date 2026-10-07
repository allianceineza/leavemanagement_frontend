import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getJson, postJson, openFile } from "../api";
import AppHeader from "../components/AppHeader";
import StatusBadge from "../components/StatusBadge";

type Tab = "decide" | "decisions" | "hrleave";

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
  has_document: number;
}
interface DecisionRow {
  request_id: number;
  full_name: string;
  email: string;
  department_name: string;
  type_name: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  status: string;
  decision_date: string | null;
  decision_comment: string | null;
}
interface HrLeaveRow {
  full_name: string;
  email: string;
  department_name: string;
  type_name: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
}

function localToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function Person({ name, email }: { name: string; email: string }) {
  return (
    <>
      <div className="person-name">{name}</div>
      <div className="person-email">{email}</div>
    </>
  );
}

function Workspace({ role }: { role: string }) {
  const fullName = localStorage.getItem("fullName") || "";

  const [tab, setTab] = useState<Tab>("decide");
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [decisionFilter, setDecisionFilter] = useState("");
  const [hrRange, setHrRange] = useState({ from: localToday(), to: localToday() });
  const [hrRows, setHrRows] = useState<HrLeaveRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    try {
      setPending(await getJson<PendingRequest[]>("/leave/pending"));
      setDecisions(await getJson<DecisionRow[]>("/leave/decisions"));
      const notices = await getJson<{ request_id: number }[]>("/leave/notifications");
      setUnread(notices.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load data");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadHrLeave() {
    setError("");
    try {
      setHrRows(
        await getJson<HrLeaveRow[]>(`/leave/hr-on-leave?from=${hrRange.from}&to=${hrRange.to}`)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load data");
    }
  }

  useEffect(() => {
    if (tab === "hrleave") loadHrLeave();
  }, [tab]);

  async function decide(id: number, decision: "Approved" | "Rejected") {
    setError("");
    setMessage("");
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
    try {
      const res = await postJson<{ message: string }>(`/leave/requests/${id}/decision`, {
        decision,
        comment,
      });
      setMessage(res.message);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save decision");
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

  const shownDecisions = decisions.filter((d) => !decisionFilter || d.status === decisionFilter);

  const tabs: { id: Tab; label: string }[] = [
    { id: "decide", label: pending.length > 0 ? `To decide (${pending.length})` : "To decide" },
    { id: "decisions", label: "My decisions" },
  ];
    if (role === "Chief") tabs.push({ id: "hrleave", label: "HR staff on leave" });

  const staffLinks =
    role === "Manager" || role === "Chief" ? [{ to: "/employees", label: "Employees" }] : [];

  return (
    <>
      <AppHeader links={[...staffLinks, { to: "/my-leave", label: "My own leave" }]} />

      <div className="dashboard">
        <h1 className="page-title">Leave approvals</h1>
        <p className="page-subtitle">Welcome, {fullName}.</p>

        {unread > 0 && (
          <p className="warning">
            You have {unread} new decision{unread === 1 ? "" : "s"} on your own leave requests.{" "}
            <Link to="/my-leave">View my leave</Link>
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

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

        {tab === "decide" && (
          <section>
            <h2>
              {role === "Chief" ? "Pending leave requests from HR staff" : "Pending requests to decide"}
            </h2>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Document</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.request_id}>
                    <td>
                      <Person name={r.full_name} email={r.email} />
                    </td>
                    <td>{r.department_name}</td>
                    <td>{r.type_name}</td>
                    <td>{r.start_date}</td>
                    <td>{r.end_date}</td>
                    <td>{r.number_of_days}</td>
                    <td>{r.reason || ""}</td>
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
                      <button
                        className="small-button approve"
                        onClick={() => decide(r.request_id, "Approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="small-button danger"
                        onClick={() => decide(r.request_id, "Rejected")}
                      >
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

        {tab === "decisions" && (
          <section>
            <h2>Decisions I have made</h2>
            <div className="filters">
              <label htmlFor="decisionFilter">Show</label>
              <select
                id="decisionFilter"
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value)}
              >
                <option value="">All decisions</option>
                <option value="Approved">Approved only</option>
                <option value="Rejected">Rejected only</option>
              </select>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Decision</th>
                  <th>Decided on</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {shownDecisions.map((r) => (
                  <tr key={r.request_id}>
                    <td>
                      <Person name={r.full_name} email={r.email} />
                    </td>
                    <td>{r.department_name}</td>
                    <td>{r.type_name}</td>
                    <td>{r.start_date}</td>
                    <td>{r.end_date}</td>
                    <td>{r.number_of_days}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>{r.decision_date ? String(r.decision_date).slice(0, 10) : ""}</td>
                    <td>{r.decision_comment || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shownDecisions.length === 0 && (
              <p className="empty">You have not made any decisions yet.</p>
            )}
          </section>
        )}

        {tab === "hrleave" && (
          <section>
            <h2>HR staff on approved leave</h2>
            <p className="muted">
              Shows HR staff on approved leave for the dates you choose. Pick past dates to see
              history, or future dates to plan ahead. Reasons for leave are not shown.
            </p>
            <div className="filters">
              <label htmlFor="hrFrom">From</label>
              <input
                id="hrFrom"
                type="date"
                value={hrRange.from}
                onChange={(e) => setHrRange({ ...hrRange, from: e.target.value })}
              />
              <label htmlFor="hrTo">To</label>
              <input
                id="hrTo"
                type="date"
                value={hrRange.to}
                onChange={(e) => setHrRange({ ...hrRange, to: e.target.value })}
              />
              <button className="small-button" onClick={loadHrLeave}>
                Show
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {hrRows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <Person name={r.full_name} email={r.email} />
                    </td>
                    <td>{r.department_name}</td>
                    <td>{r.type_name}</td>
                    <td>{r.start_date}</td>
                    <td>{r.end_date}</td>
                    <td>{r.number_of_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hrRows.length === 0 && (
              <p className="empty">No HR staff are on approved leave in this period.</p>
            )}
          </section>
        )}
      </div>
    </>
  );
}

export default function Dashboard() {
  const role = localStorage.getItem("role") || "";
  if (role === "HR") return <Navigate to="/manage" replace />;
  if (role !== "Manager" && role !== "Chief") return <Navigate to="/my-leave" replace />;
  return <Workspace role={role} />;
}