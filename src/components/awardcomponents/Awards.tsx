import { Fragment, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteJson, getJson, putJson } from "../../api";
import AppHeader from "../AppHeader";
import { awardLinks, localToday } from "./AwardHelpers";

interface AwardRow {
  award_id: number;
  award_date: string;
  reason: string;
  employee_id: number;
  full_name: string;
  employee_code: string | null;
  department_name: string;
  award_type_id: number;
  award_name: string;
  awarded_by_name: string | null;
}
interface AwardType {
  award_type_id: number;
  name: string;
  is_active: number;
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

export default function Awards() {
  const role = localStorage.getItem("role");
  const isHR = role === "HR";
  const navigate = useNavigate();
  const location = useLocation();
  const thisYear = new Date().getFullYear();

  const [rows, setRows] = useState<AwardRow[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [types, setTypes] = useState<AwardType[]>([]);
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: number; originalType: number } | null>(null);
  const [form, setForm] = useState({ reason: "", awardDate: "", awardTypeId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    (location.state as { message?: string } | null)?.message ?? ""
  );

  useEffect(() => {
    getJson<{ data: AwardType[] }>("/awards/types?all=1")
      .then((res) => setTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getJson<{ data: AwardRow[]; meta: Meta }>(
        `/awards${qs({ search, award_type_id: typeId, year, page: String(page), limit: "20" })}`
      )
        .then((res) => {
          setRows(res.data);
          setMeta(res.meta);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, typeId, year, page, reload]);

  function startEdit(a: AwardRow) {
    setError("");
    setMessage("");
    setEditing({ id: a.award_id, originalType: a.award_type_id });
    setForm({
      reason: a.reason,
      awardDate: String(a.award_date).slice(0, 10),
      awardTypeId: String(a.award_type_id),
    });
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    setMessage("");

    if (form.reason.trim().length < 3) {
      setError("Please give the reason for the award (at least 3 characters).");
      return;
    }
    if (form.awardDate > localToday()) {
      setError("The award date cannot be in the future.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        reason: form.reason.trim(),
        awardDate: form.awardDate,
      };
      // Only send the type when it was changed, so an award keeps a type that is now inactive
      if (Number(form.awardTypeId) !== editing.originalType) body.awardTypeId = Number(form.awardTypeId);
      const res = await putJson<{ message: string }>(`/awards/${editing.id}`, body);
      setMessage(res.message);
      setEditing(null);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the award");
    } finally {
      setSaving(false);
    }
  }

  async function remove(a: AwardRow) {
    setError("");
    setMessage("");
    if (
      !window.confirm(
        `Remove the "${a.award_name}" award from ${a.full_name}?\n\nThe removal stays in their history.`
      )
    ) {
      return;
    }
    try {
      const res = await deleteJson<{ message: string }>(`/awards/${a.award_id}`);
      setMessage(res.message);
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the award");
    }
  }

  return (
    <>
      <AppHeader links={awardLinks(role)} />
      <div className="dashboard">
        <h1 className="page-title">Awards</h1>
        <p className="page-subtitle">
          {role === "Manager"
            ? "Awards given to people in your department."
            : "Awards given to employees."}
        </p>

        {isHR && (
          <div className="filters">
            <button className="small-button" onClick={() => navigate("/awards/new")}>
              Give an award
            </button>
            <button className="small-button secondary" onClick={() => navigate("/awards/types")}>
              Manage award types
            </button>
          </div>
        )}

        <div className="filters">
          <label htmlFor="awSearch">Search</label>
          <input
            id="awSearch"
            placeholder="Employee name or code"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <label htmlFor="awType">Award</label>
          <select
            id="awType"
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {types.map((t) => (
              <option key={t.award_type_id} value={t.award_type_id}>
                {t.name}
              </option>
            ))}
          </select>
          <label htmlFor="awYear">Year</label>
          <select
            id="awYear"
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {Array.from({ length: 6 }, (_, i) => thisYear - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
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
                <th>Employee</th>
                <th>Department</th>
                <th>Award</th>
                <th>Date</th>
                <th>Reason</th>
                <th>Given by</th>
                {isHR && <th></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <Fragment key={a.award_id}>
                  <tr>
                    <td>
                      <div className="person-name">{a.full_name}</div>
                      <div className="person-email">{a.employee_code ?? ""}</div>
                    </td>
                    <td>{a.department_name}</td>
                    <td>{a.award_name}</td>
                    <td className="nowrap">{String(a.award_date).slice(0, 10)}</td>
                    <td style={{ whiteSpace: "pre-wrap" }}>{a.reason}</td>
                    <td>{a.awarded_by_name ?? ""}</td>
                    {isHR && (
                      <td className="actions">
                        <button className="small-button secondary" onClick={() => startEdit(a)}>
                          Edit
                        </button>
                        <button className="small-button danger" onClick={() => remove(a)}>
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                  {editing?.id === a.award_id && (
                    <tr>
                      <td colSpan={7}>
                        <form onSubmit={saveEdit} className="request-form">
                          <div className="form-grid">
                            <div>
                              <label htmlFor="edType">Award</label>
                              <select
                                id="edType"
                                value={form.awardTypeId}
                                onChange={(e) => setForm({ ...form, awardTypeId: e.target.value })}
                              >
                                {types
                                  .filter((t) => Number(t.is_active) || t.award_type_id === editing.originalType)
                                  .map((t) => (
                                    <option key={t.award_type_id} value={t.award_type_id}>
                                      {t.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                            <div>
                              <label htmlFor="edDate">Date</label>
                              <input
                                id="edDate"
                                type="date"
                                max={localToday()}
                                value={form.awardDate}
                                onChange={(e) => setForm({ ...form, awardDate: e.target.value })}
                              />
                            </div>
                            <div className="full">
                              <label htmlFor="edReason">Reason</label>
                              <textarea
                                id="edReason"
                                rows={3}
                                value={form.reason}
                                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="filters">
                            <button type="submit" className="submit" disabled={saving}>
                              {saving ? "Saving..." : "Save changes"}
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
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {loading && <p className="muted">Loading...</p>}
          {!loading && rows.length === 0 && <p className="empty">No awards found.</p>}
        </section>

        <div className="filters">
          <button className="small-button secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="muted">
            Page {meta.page} of {meta.pages || 1} ({meta.total} awards)
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
    </>
  );
}