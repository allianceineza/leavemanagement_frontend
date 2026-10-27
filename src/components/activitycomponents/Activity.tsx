import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { deleteJson, getJson, postJson } from "../../api";
import StatusBadge from "../StatusBadge";
import ActivityCountdown from "./ActivityCountdown";
import { CATEGORIES, fmt, timeOf } from "./ActivityHelpers";

interface Row {
  activity_id: number;
  title: string;
  category: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  registration_deadline: string | null;
  max_participants: number | null;
  uses_teams: number;
  status: string;
  registered: number;
  my_status: string | null;
}
interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function qs(params: Record<string, string>): string {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`);
  return parts.length ? "?" + parts.join("&") : "";
}

export default function Activities() {
  const isHR = localStorage.getItem("role") === "HR";
  const navigate = useNavigate();
  const location = useLocation();

  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 12, pages: 0 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [when, setWhen] = useState("upcoming");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    (location.state as { message?: string } | null)?.message ?? ""
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getJson<{ data: Row[]; meta: Meta }>(
        `/activities${qs({ search, category, status, when, page: String(page), limit: "12" })}`
      )
        .then((res) => {
          setRows(res.data);
          setMeta(res.meta);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category, status, when, page, reload]);

  async function register(a: Row) {
    setError("");
    setMessage("");
    try {
      await postJson<{ message: string }>(`/activities/${a.activity_id}/register`, {});
      setMessage(`You are registered for ${a.title}.`);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register");
    }
  }

  async function cancel(a: Row) {
    setError("");
    setMessage("");
    if (!window.confirm(`Cancel your registration for ${a.title}?`)) return;
    try {
      const res = await deleteJson<{ message: string }>(`/activities/${a.activity_id}/register`);
      setMessage(res.message);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel");
    }
  }

  return (
    <div className="dashboard">
      <h1 className="page-title">Sports and activities</h1>
      <p className="page-subtitle">Sports, social events and trainings. Register before the countdown ends.</p>

      {isHR && (
        <div className="filters">
          <button className="small-button" onClick={() => navigate("/activities/new")}>
            Add activity
          </button>
        </div>
      )}

      <div className="filters">
        <label htmlFor="actSearch">Search</label>
        <input
          id="actSearch"
          placeholder="Title"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <label htmlFor="actCat">Category</label>
        <select
          id="actCat"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label htmlFor="actStatus">Status</label>
        <select
          id="actStatus"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Completed">Completed</option>
        </select>
        <label htmlFor="actWhen">When</label>
        <select
          id="actWhen"
          value={when}
          onChange={(e) => {
            setWhen(e.target.value);
            setPage(1);
          }}
        >
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="">All</option>
        </select>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="success">{message}</p>}

      <section>
        <table>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Starts</th>
              <th>Where</th>
              <th>Places</th>
              <th>Registration closes in</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const closes = a.registration_deadline ?? a.starts_at;
              const registrationOpen = a.status === "Open" && timeOf(closes) > Date.now();
              const full = a.max_participants !== null && a.registered >= a.max_participants;
              const mine = a.my_status === "Registered";
              return (
                <tr key={a.activity_id}>
                  <td>
                    <div className="person-name">
                      <Link to={`/activities/${a.activity_id}`}>{a.title}</Link>
                    </div>
                    <div className="person-email">
                      {a.category}
                      {a.uses_teams ? ", teams" : ""}
                    </div>
                  </td>
                  <td className="nowrap">{fmt(a.starts_at)}</td>
                  <td>{a.location ?? ""}</td>
                  <td>
                    {a.max_participants === null ? `${a.registered} registered` : `${a.registered} / ${a.max_participants}`}
                    {full && <div className="person-email">Full</div>}
                  </td>
                  <td className="nowrap">
                    <ActivityCountdown closesAt={closes} status={a.status} />
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                    {mine && <div className="person-email">You are registered</div>}
                  </td>
                  <td className="actions">
                    <button
                      className="small-button secondary"
                      onClick={() => navigate(`/activities/${a.activity_id}`)}
                    >
                      View
                    </button>
                    {registrationOpen && !mine && !full && (
                      <button className="small-button approve" onClick={() => register(a)}>
                        Register
                      </button>
                    )}
                    {mine && timeOf(a.starts_at) > Date.now() && (
                      <button className="small-button danger" onClick={() => cancel(a)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <p className="muted">Loading...</p>}
        {!loading && rows.length === 0 && <p className="empty">No activities found.</p>}
      </section>

      <div className="filters">
        <button className="small-button secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span className="muted">
          Page {meta.page} of {meta.pages || 1} ({meta.total} activities)
        </span>
        <button
          className="small-button secondary"
          disabled={page >= meta.pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}