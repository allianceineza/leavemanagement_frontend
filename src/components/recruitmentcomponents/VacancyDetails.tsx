import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { downloadFile, getJson, patchJson, postJson } from "../../api";
import AppHeader from "../AppHeader";
import StatusBadge from "../StatusBadge";
import Countdown from "./Countdown";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

interface Vacancy {
  vacancy_id: number;
  title: string;
  department_name: string;
  description: string | null;
  requirements: string | null;
  openings: number;
  closing_date: string | null;
  status: string;
  created_at: string;
  created_by_name: string | null;
  applications: number;
  hired: number;
}
interface ApplicationRow {
  application_id: number;
  status: string;
  applied_date: string;
  notes: string | null;
  employee_id: number | null;
  applicant_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  interviews: number;
}

// Moves HR may make from each stage (the server enforces the same rules)
const NEXT: Record<string, string[]> = {
  Applied: ["Shortlisted", "Rejected", "Withdrawn"],
  Shortlisted: ["Interview", "Rejected", "Withdrawn"],
  Interview: ["Selected", "Rejected", "Withdrawn"],
  Selected: ["Rejected", "Withdrawn"],
};

const STAGES = ["Applied", "Shortlisted", "Interview", "Selected", "Hired", "Rejected", "Withdrawn"];

const EMPTY_FORM = { fullName: "", email: "", phone: "", nationalId: "", notes: "" };

export default function VacancyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isHR = localStorage.getItem("role") === "HR";

  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [stageFilter, setStageFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    (location.state as { message?: string } | null)?.message ?? ""
  );
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const v = await getJson<{ data: Vacancy }>(`/recruitment/vacancies/${id}`);
      setVacancy(v.data);
      const q = stageFilter ? `?status=${encodeURIComponent(stageFilter)}` : "";
      const a = await getJson<{ data: ApplicationRow[] }>(
        `/recruitment/vacancies/${id}/applications${q}`
      );
      setApplications(a.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [id, stageFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function addApplicant(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.fullName.trim() || !form.email.trim()) {
      setError("Please enter the applicant's name and email.");
      return;
    }
    if (form.phone.trim() && !/^[0-9+\-\s()]{7,30}$/.test(form.phone.trim())) {
      setError("The phone number is not valid.");
      return;
    }

    setSaving(true);
    try {
      const res = await postJson<{ message: string }>(`/recruitment/vacancies/${id}/applications`, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        nationalId: form.nationalId.trim(),
        notes: form.notes.trim(),
      });
      setMessage(res.message);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the applicant");
    } finally {
      setSaving(false);
    }
  }

  async function moveTo(app: ApplicationRow, status: string) {
    setError("");
    setMessage("");
    let comment = "";
    if (status === "Rejected" || status === "Withdrawn") {
      const answer = window.prompt(`Reason for setting ${app.full_name} to ${status}:`);
      if (answer === null) return;
      comment = answer.trim();
      if (comment.length < 3) {
        setError("Please give a reason (at least 3 characters).");
        return;
      }
    }
    try {
      const res = await patchJson<{ message: string }>(
        `/recruitment/applications/${app.application_id}/status`,
        { status, comment }
      );
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the stage");
    }
  }

  async function downloadPdf() {
    setError("");
    setMessage("");
    try {
      const q = stageFilter ? `?status=${encodeURIComponent(stageFilter)}` : "";
      const name = `applicants-${vacancy?.title ?? "vacancy"}-${(stageFilter || "all").toLowerCase()}.pdf`
        .replace(/[^A-Za-z0-9._-]+/g, "-");
      await downloadFile(`/recruitment/vacancies/${id}/export${q}`, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download the PDF");
    }
  }

  const rows: [string, string | number | null][] = vacancy
    ? [
        ["Department", vacancy.department_name],
        ["Openings", vacancy.openings],
        ["Hired so far", vacancy.hired],
        ["Closing date", vacancy.closing_date],
        ["Created by", vacancy.created_by_name],
        ["Created on", vacancy.created_at],
        ["Description", vacancy.description],
        ["Requirements", vacancy.requirements],
      ]
    : [];

  const deadlinePassed = vacancy?.closing_date
    ? new Date(`${vacancy.closing_date.slice(0, 10)}T23:59:59`).getTime() < Date.now()
    : false;
  const canAddApplicants = isHR && vacancy?.status === "Open" && !deadlinePassed;

  return (
    <>
      <AppHeader links={[{ to: "/recruitment", label: "Back to vacancies" }]} />
      <div className="dashboard">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        {vacancy && (
          <>
            <h1 className="page-title">{vacancy.title}</h1>
            <p className="page-subtitle">
              <StatusBadge status={vacancy.status} />
            </p>

            {isHR && (
              <div className="filters">
                <button
                  className="small-button"
                  onClick={() => navigate(`/recruitment/${vacancy.vacancy_id}/edit`)}
                >
                  Edit vacancy
                </button>
              </div>
            )}

            <section>
              <h2>Time left to apply</h2>
              <p style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
                <Countdown closingDate={vacancy.closing_date} active={vacancy.status === "Open"} />
              </p>
              {vacancy.closing_date && vacancy.status === "Open" && (
                <p className="muted">Applications close at the end of {vacancy.closing_date}.</p>
              )}
            </section>

            <section>
              <table>
                <tbody>
                  {rows.map(([label, value]) => (
                    <tr key={label}>
                      <th>{label}</th>
                      <td style={{ whiteSpace: "pre-wrap" }}>{value ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h2>Applications ({vacancy.applications})</h2>

              {isHR && vacancy.status !== "Open" && (
                <p className="muted">
                  This vacancy is {vacancy.status}, so new applications cannot be added. Reopen
                  it from the vacancy list first.
                </p>
              )}
              {isHR && vacancy.status === "Open" && deadlinePassed && (
                <p className="muted">
                  The closing date has passed, so new applications cannot be added. Edit the
                  vacancy to extend the date.
                </p>
              )}

              <div className="filters">
                {canAddApplicants && (
                  <button className="small-button" onClick={() => setShowForm((s) => !s)}>
                    {showForm ? "Cancel" : "Add applicant"}
                  </button>
                )}
                <label htmlFor="stageFilter">Stage</label>
                <select
                  id="stageFilter"
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                >
                  <option value="">All</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {isHR && (
                  <button className="small-button secondary" onClick={downloadPdf}>
                    Download PDF ({stageFilter || "all stages"})
                  </button>
                )}
              </div>

              {showForm && canAddApplicants && (
                <form onSubmit={addApplicant} className="request-form">
                  <p className="hint">
                    Time left to apply: <Countdown closingDate={vacancy.closing_date} />
                  </p>
                  <div className="form-grid">
                    <div>
                      <label htmlFor="appName">
                        Full name <span className="required" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="appName"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="appEmail">
                        Email <span className="required" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="appEmail"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                      <p className="hint">
                        If this person applied before, their existing record is reused.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="appPhone">Phone</label>
                      <input
                        id="appPhone"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="appNid">National ID</label>
                      <input
                        id="appNid"
                        value={form.nationalId}
                        onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                      />
                    </div>
                    <div className="full">
                      <label htmlFor="appNotes">Notes</label>
                      <input
                        id="appNotes"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="submit" disabled={saving}>
                    {saving ? "Adding..." : "Add application"}
                  </button>
                </form>
              )}

              <table>
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Phone</th>
                    <th>Applied on</th>
                    <th>Stage</th>
                    <th>Notes</th>
                    {isHR && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a) => (
                    <tr key={a.application_id}>
                      <td>
                        <div className="person-name">
                          <Link to={`/recruitment/applications/${a.application_id}`}>{a.full_name}</Link>
                        </div>
                        <div className="person-email">{a.email}</div>
                      </td>
                      <td>{a.phone || ""}</td>
                      <td className="nowrap">{a.applied_date}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>{a.notes || ""}</td>
                      {isHR && (
                        <td className="actions">
                          {a.status === "Selected" && (
                            <button
                              className="small-button approve"
                              onClick={() => navigate(`/recruitment/applications/${a.application_id}`)}
                            >
                              Hire
                            </button>
                          )}
                          {(NEXT[a.status] ?? []).map((s) => (
                            <button
                              key={s}
                              className={
                                s === "Rejected"
                                  ? "small-button danger"
                                  : s === "Withdrawn"
                                    ? "small-button secondary"
                                    : "small-button approve"
                              }
                              onClick={() => moveTo(a, s)}
                            >
                              {s}
                            </button>
                          ))}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {applications.length === 0 && <p className="empty">No applications yet.</p>}
            </section>
          </>
        )}
      </div>
    </>
  );
}