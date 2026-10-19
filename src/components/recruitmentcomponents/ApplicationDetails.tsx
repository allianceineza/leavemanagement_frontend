import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { getJson, patchJson, postJson } from "../../api";
import AppHeader from "../AppHeader";
import StatusBadge from "../StatusBadge";

interface HistoryRow {
  id: number;
  from_status: string | null;
  to_status: string;
  comment: string | null;
  changed_at: string;
  changed_by: string | null;
}
interface Application {
  application_id: number;
  vacancy_id: number;
  vacancy_title: string;
  vacancy_department_id: number;
  employee_id: number | null;
  status: string;
  applied_date: string;
  notes: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  national_id: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  next_statuses: string[];
  history: HistoryRow[];
}
interface Interview {
  interview_id: number;
  interview_at: string;
  location: string | null;
  result: string;
  score: number | null;
  feedback: string | null;
  interviewer_name: string | null;
}
interface EmployeeOption {
  employee_id: number;
  full_name: string;
}
interface Department {
  department_id: number;
  department_name: string;
}

function localNowInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function localToday(): string {
  return localNowInput().slice(0, 10);
}

function hasPassed(value: string): boolean {
  return new Date(value.replace(" ", "T")).getTime() <= Date.now();
}

function shortDateTime(value: string): string {
  return value.replace("T", " ").slice(0, 16);
}

function makePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const EMPTY_HIRE = {
  hireDate: "",
  departmentId: "",
  jobTitle: "",
  managerId: "",
  role: "Employee",
  password: "",
};

export default function ApplicationDetails() {
  const { id } = useParams();
  const isHR = localStorage.getItem("role") === "HR";

  const [app, setApp] = useState<Application | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState({ interviewAt: "", location: "", interviewerId: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [resultForm, setResultForm] = useState({ result: "Passed", score: "", feedback: "" });
  const [showHire, setShowHire] = useState(false);
  const [hire, setHire] = useState(EMPTY_HIRE);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const a = await getJson<{ data: Application }>(`/recruitment/applications/${id}`);
      setApp(a.data);
      const i = await getJson<{ data: Interview[] }>(`/recruitment/applications/${id}/interviews`);
      setInterviews(i.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isHR) return;
    getJson<{ data: EmployeeOption[] }>("/employees?status=Active&limit=100")
      .then((res) => setEmployees(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
    getJson<unknown>("/departments")
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : Array.isArray((res as { data?: unknown })?.data)
            ? (res as { data: Department[] }).data
            : [];
        setDepartments(list as Department[]);
      })
      .catch(() => {});
  }, [isHR]);

  async function scheduleInterview(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!schedule.interviewAt) {
      setError("Please choose the interview date and time.");
      return;
    }
    if (new Date(schedule.interviewAt).getTime() < Date.now()) {
      setError("The interview time must be in the future.");
      return;
    }

    setSaving(true);
    try {
      const res = await postJson<{ message: string }>(`/recruitment/applications/${id}/interviews`, {
        interviewAt: schedule.interviewAt,
        location: schedule.location.trim(),
        interviewerId: schedule.interviewerId ? Number(schedule.interviewerId) : undefined,
      });
      setMessage(res.message);
      setSchedule({ interviewAt: "", location: "", interviewerId: "" });
      setShowSchedule(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule the interview");
    } finally {
      setSaving(false);
    }
  }

  function startResult(i: Interview) {
    setEditingId(i.interview_id);
    setResultForm({
      result: i.result === "Pending" ? "Passed" : i.result,
      score: i.score === null ? "" : String(i.score),
      feedback: i.feedback ?? "",
    });
  }

  async function saveResult(e: FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    setError("");
    setMessage("");

    if (resultForm.score !== "") {
      const n = Number(resultForm.score);
      if (!Number.isInteger(n) || n < 0 || n > 100) {
        setError("The score must be a whole number from 0 to 100.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await patchJson<{ message: string }>(`/recruitment/interviews/${editingId}/result`, {
        result: resultForm.result,
        score: resultForm.score,
        feedback: resultForm.feedback.trim(),
      });
      setMessage(res.message);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the result");
    } finally {
      setSaving(false);
    }
  }

  async function moveTo(status: string) {
    if (!app) return;
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

  function openHireForm() {
    if (!app) return;
    setHire({
      ...EMPTY_HIRE,
      hireDate: localToday(),
      departmentId: String(app.vacancy_department_id),
      jobTitle: app.vacancy_title.slice(0, 100),
    });
    setShowHire(true);
  }

  async function hireApplicant(e: FormEvent) {
    e.preventDefault();
    if (!app) return;
    setError("");
    setMessage("");

    if (!hire.hireDate) {
      setError("Please choose the hire date.");
      return;
    }
    if (!hire.departmentId) {
      setError("Please choose a department.");
      return;
    }
    if (hire.password.length < 8) {
      setError("The temporary password must be at least 8 characters.");
      return;
    }
    if (
      !window.confirm(
        `Hire ${app.full_name} as an employee? This creates their employee record, login and leave balances.`
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const res = await postJson<{
        message: string;
        employee_code: string;
        vacancy_filled: boolean;
      }>(`/recruitment/applications/${app.application_id}/hire`, {
        hireDate: hire.hireDate,
        departmentId: Number(hire.departmentId),
        jobTitle: hire.jobTitle.trim(),
        managerId: hire.managerId ? Number(hire.managerId) : undefined,
        role: hire.role,
        password: hire.password,
      });
      setMessage(
        `${res.message}. Employee code ${res.employee_code}. Share the temporary password with them yourself.` +
          (res.vacancy_filled ? " All openings are now filled, so the vacancy was marked Filled." : "")
      );
      setShowHire(false);
      setHire(EMPTY_HIRE);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not hire the applicant");
    } finally {
      setSaving(false);
    }
  }

  const details: [string, string | null][] = app
    ? [
        ["Vacancy", app.vacancy_title],
        ["Email", app.email],
        ["Phone", app.phone],
        ["National ID", app.national_id],
        ["Gender", app.gender],
        ["Date of birth", app.date_of_birth],
        ["Address", app.address],
        ["Applied on", app.applied_date],
        ["Notes", app.notes],
      ]
    : [];

  const canSchedule = isHR && (app?.status === "Shortlisted" || app?.status === "Interview");
  const canHire = isHR && app?.status === "Selected" && !app?.employee_id;

  return (
    <>
      <AppHeader
        links={[
          {
            to: app ? `/recruitment/${app.vacancy_id}` : "/recruitment",
            label: "Back to vacancy",
          },
        ]}
      />
      <div className="dashboard">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        {app && (
          <>
            <h1 className="page-title">{app.full_name}</h1>
            <p className="page-subtitle">
              Applied for {app.vacancy_title} <StatusBadge status={app.status} />
            </p>

            {isHR && app.next_statuses.length > 0 && (
              <div className="filters">
                <span className="muted">Move to:</span>
                {app.next_statuses.map((s) => (
                  <button
                    key={s}
                    className={
                      s === "Rejected"
                        ? "small-button danger"
                        : s === "Withdrawn"
                          ? "small-button secondary"
                          : "small-button approve"
                    }
                    onClick={() => moveTo(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {app.employee_id && (
              <section>
                <h2>Employee record</h2>
                <p>
                  This applicant was hired and is now an employee.{" "}
                  <Link to={`/employees/${app.employee_id}`}>View employee record</Link>
                </p>
              </section>
            )}

            {canHire && (
              <section>
                <h2>Hire as employee</h2>
                <p className="muted">
                  This applicant was selected. Hiring creates their employee record, login and
                  leave balances in one step.
                </p>
                {!showHire ? (
                  <div className="filters">
                    <button className="small-button approve" onClick={openHireForm}>
                      Hire as employee
                    </button>
                  </div>
                ) : (
                  <form onSubmit={hireApplicant} className="request-form">
                    <div className="form-grid">
                      <div>
                        <label htmlFor="hireDate">
                          Hire date <span className="required" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="hireDate"
                          type="date"
                          value={hire.hireDate}
                          onChange={(e) => setHire({ ...hire, hireDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="hireDept">
                          Department <span className="required" aria-hidden="true">*</span>
                        </label>
                        <select
                          id="hireDept"
                          value={hire.departmentId}
                          onChange={(e) => setHire({ ...hire, departmentId: e.target.value })}
                        >
                          <option value="">Choose a department</option>
                          {departments.map((d) => (
                            <option key={d.department_id} value={d.department_id}>
                              {d.department_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="hireTitle">Job title</label>
                        <input
                          id="hireTitle"
                          value={hire.jobTitle}
                          onChange={(e) => setHire({ ...hire, jobTitle: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="hireManager">Manager / supervisor</label>
                        <select
                          id="hireManager"
                          value={hire.managerId}
                          onChange={(e) => setHire({ ...hire, managerId: e.target.value })}
                        >
                          <option value="">None</option>
                          {employees.map((emp) => (
                            <option key={emp.employee_id} value={emp.employee_id}>
                              {emp.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="hireRole">Login role</label>
                        <select
                          id="hireRole"
                          value={hire.role}
                          onChange={(e) => setHire({ ...hire, role: e.target.value })}
                        >
                          <option value="Employee">Employee</option>
                          <option value="Manager">Manager</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="hirePassword">
                          Temporary password <span className="required" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="hirePassword"
                          value={hire.password}
                          autoComplete="off"
                          onChange={(e) => setHire({ ...hire, password: e.target.value })}
                        />
                        <p className="hint">
                          At least 8 characters. Share it with the new employee yourself.{" "}
                          <button
                            type="button"
                            className="small-button secondary"
                            onClick={() => setHire({ ...hire, password: makePassword() })}
                          >
                            Generate
                          </button>
                        </p>
                      </div>
                    </div>
                    <div className="filters">
                      <button type="submit" className="submit" disabled={saving}>
                        {saving ? "Hiring..." : "Hire and create employee"}
                      </button>
                      <button
                        type="button"
                        className="small-button secondary"
                        onClick={() => setShowHire(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}

            <section>
              <table>
                <tbody>
                  {details.map(([label, value]) => (
                    <tr key={label}>
                      <th>{label}</th>
                      <td style={{ whiteSpace: "pre-wrap" }}>{value ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h2>Interviews ({interviews.length})</h2>

              {isHR && !canSchedule && (
                <p className="muted">
                  Interviews can be scheduled while the applicant is Shortlisted or at the
                  Interview stage. This application is {app.status}.
                </p>
              )}

              {canSchedule && (
                <div className="filters">
                  <button className="small-button" onClick={() => setShowSchedule((s) => !s)}>
                    {showSchedule ? "Cancel" : "Schedule interview"}
                  </button>
                </div>
              )}

              {showSchedule && canSchedule && (
                <form onSubmit={scheduleInterview} className="request-form">
                  <div className="form-grid">
                    <div>
                      <label htmlFor="intAt">
                        Date and time <span className="required" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="intAt"
                        type="datetime-local"
                        min={localNowInput()}
                        value={schedule.interviewAt}
                        onChange={(e) => setSchedule({ ...schedule, interviewAt: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="intLoc">Location</label>
                      <input
                        id="intLoc"
                        placeholder="Room, office or online link"
                        value={schedule.location}
                        onChange={(e) => setSchedule({ ...schedule, location: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="intWho">Interviewer</label>
                      <select
                        id="intWho"
                        value={schedule.interviewerId}
                        onChange={(e) => setSchedule({ ...schedule, interviewerId: e.target.value })}
                      >
                        <option value="">Not assigned</option>
                        {employees.map((emp) => (
                          <option key={emp.employee_id} value={emp.employee_id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="submit" disabled={saving}>
                    {saving ? "Saving..." : "Schedule interview"}
                  </button>
                </form>
              )}

              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Where</th>
                    <th>Interviewer</th>
                    <th>Result</th>
                    <th>Score</th>
                    <th>Feedback</th>
                    {isHR && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((i) => (
                    <tr key={i.interview_id}>
                      <td className="nowrap">{shortDateTime(i.interview_at)}</td>
                      <td>{i.location || ""}</td>
                      <td>{i.interviewer_name || ""}</td>
                      <td>
                        <StatusBadge status={i.result} />
                      </td>
                      <td>{i.score === null ? "" : i.score}</td>
                      <td style={{ whiteSpace: "pre-wrap" }}>{i.feedback || ""}</td>
                      {isHR && (
                        <td className="actions">
                          {hasPassed(i.interview_at) ? (
                            <button className="small-button secondary" onClick={() => startResult(i)}>
                              {i.result === "Pending" ? "Record result" : "Edit result"}
                            </button>
                          ) : (
                            <span className="muted">Upcoming</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {interviews.length === 0 && <p className="empty">No interviews scheduled yet.</p>}

              {editingId !== null && isHR && (
                <form onSubmit={saveResult} className="request-form">
                  <h3>Interview result</h3>
                  <div className="form-grid">
                    <div>
                      <label htmlFor="resResult">Result</label>
                      <select
                        id="resResult"
                        value={resultForm.result}
                        onChange={(e) => setResultForm({ ...resultForm, result: e.target.value })}
                      >
                        <option value="Passed">Passed</option>
                        <option value="Failed">Failed</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="resScore">Score (0 to 100)</label>
                      <input
                        id="resScore"
                        type="number"
                        min="0"
                        max="100"
                        value={resultForm.score}
                        onChange={(e) => setResultForm({ ...resultForm, score: e.target.value })}
                      />
                    </div>
                    <div className="full">
                      <label htmlFor="resFeedback">Feedback</label>
                      <textarea
                        id="resFeedback"
                        rows={3}
                        value={resultForm.feedback}
                        onChange={(e) => setResultForm({ ...resultForm, feedback: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="filters">
                    <button type="submit" className="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save result"}
                    </button>
                    <button type="button" className="small-button secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section>
              <h2>History</h2>
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Change</th>
                    <th>By</th>
                    <th>Comment</th>
                  </tr>
                </thead>
                <tbody>
                  {app.history.map((h) => (
                    <tr key={h.id}>
                      <td className="nowrap">{h.changed_at}</td>
                      <td>{h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}</td>
                      <td>{h.changed_by || ""}</td>
                      <td>{h.comment || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </>
  );
}