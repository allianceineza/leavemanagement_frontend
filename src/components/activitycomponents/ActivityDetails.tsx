import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { deleteJson, getJson, patchJson, postJson, putJson } from "../../api";
import StatusBadge from "../StatusBadge";
import ActivityCountdown from "./ActivityCountdown";
import { fmt, timeOf } from "./ActivityHelpers";

interface Activity {
  activity_id: number;
  title: string;
  category: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  registration_deadline: string | null;
  max_participants: number | null;
  uses_teams: number;
  status: string;
  created_by_name: string | null;
  registered: number;
  my_registration: { status: string; team_id: number | null; team_name: string | null } | null;
}
interface Participant {
  employee_id: number;
  full_name: string;
  employee_code: string | null;
  department_name: string;
  team_id: number | null;
  team_name: string | null;
  registered_at: string;
}
interface Team {
  team_id: number;
  name: string;
  max_members: number | null;
  captain_id: number | null;
  captain_name: string | null;
  members: number;
}
interface Person {
  employee_id: number;
  full_name: string;
  employee_code: string | null;
  department_name: string;
}

export default function ActivityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role");
  const isHR = role === "HR";
  const isStaff = role === "HR" || role === "Chief" || role === "Manager";

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamForm, setTeamForm] = useState({ name: "", maxMembers: "" });
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [pickedId, setPickedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    (location.state as { message?: string } | null)?.message ?? ""
  );

  const load = useCallback(async () => {
    try {
      const a = await getJson<{ data: Activity }>(`/activities/${id}`);
      setActivity(a.data);
      const t = await getJson<{ data: Team[] }>(`/activities/${id}/teams`);
      setTeams(Array.isArray(t.data) ? t.data : []);
      if (isStaff) {
        const p = await getJson<{ data: Participant[] }>(`/activities/${id}/participants`);
        setParticipants(Array.isArray(p.data) ? p.data : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [id, isStaff]);

  useEffect(() => {
    load();
  }, [load]);

  // HR can register an employee: search by name or code
  useEffect(() => {
    if (!isHR) return;
    const timer = setTimeout(() => {
      getJson<{ data: Person[] }>(`/employees?status=Active&limit=20&search=${encodeURIComponent(query)}`)
        .then((res) => setPeople(Array.isArray(res.data) ? res.data : []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isHR]);

  // Runs an action, then reloads. Keeps every button's error handling in one place.
  async function run(action: () => Promise<{ message: string }>, ok?: string) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await action();
      setMessage(ok ?? res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function changeStatus(status: string) {
    if (!activity) return;
    if (status === "Cancelled" && !window.confirm("Cancel this activity? This cannot be undone.")) return;
    if (status === "Completed" && !window.confirm("Mark this activity as completed? This cannot be undone.")) return;
    run(() => patchJson(`/activities/${id}/status`, { status }));
  }

  async function removeActivity() {
    if (!window.confirm("Delete this activity?")) return;
    setError("");
    try {
      await deleteJson<{ message: string }>(`/activities/${id}`);
      navigate("/activities", { state: { message: "Activity deleted" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the activity");
    }
  }

  async function addTeam(e: FormEvent) {
    e.preventDefault();
    if (!teamForm.name.trim()) {
      setError("Please enter a team name.");
      return;
    }
    if (teamForm.maxMembers !== "") {
      const n = Number(teamForm.maxMembers);
      if (!Number.isInteger(n) || n < 1 || n > 1000) {
        setError("The member limit must be a whole number from 1 to 1000, or empty.");
        return;
      }
    }
    await run(() =>
      postJson(`/activities/${id}/teams`, {
        name: teamForm.name.trim(),
        maxMembers: teamForm.maxMembers,
      })
    );
    setTeamForm({ name: "", maxMembers: "" });
  }

  if (!activity) {
    return (
      <div className="dashboard">
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : (
          <p className="muted">Loading...</p>
        )}
      </div>
    );
  }

  const closes = activity.registration_deadline ?? activity.starts_at;
  const registrationOpen = activity.status === "Open" && timeOf(closes) > Date.now();
  const full = activity.max_participants !== null && activity.registered >= activity.max_participants;
  const mine = activity.my_registration?.status === "Registered";
  const notStarted = timeOf(activity.starts_at) > Date.now();
  const ended = activity.status === "Cancelled" || activity.status === "Completed";

  const details: [string, string | null][] = [
    ["Category", activity.category],
    ["Starts", fmt(activity.starts_at)],
    ["Ends", fmt(activity.ends_at)],
    ["Where", activity.location],
    ["Registration deadline", fmt(activity.registration_deadline) || "Until the start"],
    [
      "Places",
      activity.max_participants === null
        ? `${activity.registered} registered (no limit)`
        : `${activity.registered} of ${activity.max_participants} taken`,
    ],
    ["Teams", activity.uses_teams ? "Yes" : "No"],
    ["Created by", activity.created_by_name],
    ["Description", activity.description],
  ];

  return (
    <div className="dashboard">
      <div className="filters">
        <button className="small-button secondary" onClick={() => navigate("/activities")}>
          Back to activities
        </button>
        {isHR && !ended && (
          <button className="small-button" onClick={() => navigate(`/activities/${activity.activity_id}/edit`)}>
            Edit activity
          </button>
        )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="success">{message}</p>}

      <h1 className="page-title">{activity.title}</h1>
      <p className="page-subtitle">
        <StatusBadge status={activity.status} />
        {mine && <span className="muted"> You are registered{activity.my_registration?.team_name ? ` (${activity.my_registration.team_name})` : ""}.</span>}
      </p>

      <section>
        <h2>Registration closes in</h2>
        <p style={{ fontSize: "1.5rem", margin: "0.25rem 0" }}>
          <ActivityCountdown closesAt={closes} status={activity.status} />
        </p>
        <div className="filters">
          {registrationOpen && !mine && !full && (
            <button className="small-button approve" disabled={busy} onClick={() => run(() => postJson(`/activities/${id}/register`, {}), "You are registered.")}>
              Register
            </button>
          )}
          {registrationOpen && !mine && full && <span className="muted">This activity is full.</span>}
          {mine && notStarted && !ended && (
            <button
              className="small-button danger"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Cancel your registration?")) run(() => deleteJson(`/activities/${id}/register`));
              }}
            >
              Cancel my registration
            </button>
          )}
        </div>
      </section>

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

      {isHR && !ended && (
        <section>
          <h2>Manage</h2>
          <div className="filters">
            {activity.status === "Open" ? (
              <button className="small-button secondary" disabled={busy} onClick={() => changeStatus("Closed")}>
                Close registration
              </button>
            ) : (
              <button className="small-button approve" disabled={busy} onClick={() => changeStatus("Open")}>
                Reopen registration
              </button>
            )}
            <button className="small-button secondary" disabled={busy} onClick={() => changeStatus("Completed")}>
              Mark as completed
            </button>
            <button className="small-button danger" disabled={busy} onClick={() => changeStatus("Cancelled")}>
              Cancel activity
            </button>
            <button className="small-button danger" disabled={busy} onClick={removeActivity}>
              Delete
            </button>
          </div>
          <p className="muted">An activity with registrations cannot be deleted. Cancel it instead.</p>

          {activity.status === "Open" && (
            <div className="filters">
              <label htmlFor="regFind">Register an employee</label>
              <input id="regFind" placeholder="Search a name or code" value={query} onChange={(e) => setQuery(e.target.value)} />
              <select value={pickedId} onChange={(e) => setPickedId(e.target.value)} aria-label="Employee to register">
                <option value="">Choose from the results</option>
                {people.map((p) => (
                  <option key={p.employee_id} value={p.employee_id}>
                    {p.full_name} ({p.employee_code ?? "no code"}), {p.department_name}
                  </option>
                ))}
              </select>
              <button
                className="small-button"
                disabled={busy || !pickedId}
                onClick={() => {
                  run(() => postJson(`/activities/${id}/participants`, { employeeId: Number(pickedId) }), "Employee registered.");
                  setPickedId("");
                }}
              >
                Register
              </button>
            </div>
          )}
        </section>
      )}

      {Number(activity.uses_teams) === 1 && (
        <section>
          <h2>Teams ({teams.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>Captain</th>
                <th>Members</th>
                {isHR && <th></th>}
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => {
                const members = participants.filter((p) => p.team_id === t.team_id);
                return (
                  <tr key={t.team_id}>
                    <td>
                      <strong>{t.name}</strong>
                    </td>
                    <td>
                      {isHR && !ended ? (
                        <select
                          aria-label={`Captain of ${t.name}`}
                          value={t.captain_id ?? ""}
                          disabled={busy}
                          onChange={(e) =>
                            run(() =>
                              putJson(`/activities/${id}/teams/${t.team_id}`, {
                                captainId: e.target.value === "" ? null : Number(e.target.value),
                              })
                            )
                          }
                        >
                          <option value="">No captain</option>
                          {members.map((m) => (
                            <option key={m.employee_id} value={m.employee_id}>
                              {m.full_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        t.captain_name ?? ""
                      )}
                    </td>
                    <td>{t.max_members === null ? t.members : `${t.members} / ${t.max_members}`}</td>
                    {isHR && (
                      <td className="actions">
                        <button
                          className="small-button danger"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Delete ${t.name}? Its members stay registered, without a team.`)) {
                              run(() => deleteJson(`/activities/${id}/teams/${t.team_id}`));
                            }
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {teams.length === 0 && <p className="empty">No teams yet.</p>}

          {isHR && !ended && (
            <form onSubmit={addTeam} className="filters">
              <label htmlFor="teamName">New team</label>
              <input id="teamName" placeholder="Team name" value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} />
              <input
                aria-label="Member limit"
                placeholder="Member limit (optional)"
                inputMode="numeric"
                value={teamForm.maxMembers}
                onChange={(e) => setTeamForm({ ...teamForm, maxMembers: e.target.value })}
              />
              <button type="submit" className="small-button" disabled={busy}>
                Add team
              </button>
            </form>
          )}
        </section>
      )}

      {isStaff ? (
        <section>
          <h2>Participants ({participants.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                {Number(activity.uses_teams) === 1 && <th>Team</th>}
                <th>Registered</th>
                {isHR && <th></th>}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.employee_id}>
                  <td>
                    <div className="person-name">{p.full_name}</div>
                    <div className="person-email">{p.employee_code ?? ""}</div>
                  </td>
                  <td>{p.department_name}</td>
                  {Number(activity.uses_teams) === 1 && (
                    <td>
                      {isHR && !ended ? (
                        <select
                          aria-label={`Team for ${p.full_name}`}
                          value={p.team_id ?? ""}
                          disabled={busy}
                          onChange={(e) =>
                            run(() =>
                              patchJson(`/activities/${id}/participants/${p.employee_id}/team`, {
                                teamId: e.target.value === "" ? null : Number(e.target.value),
                              })
                            )
                          }
                        >
                          <option value="">No team</option>
                          {teams.map((t) => (
                            <option key={t.team_id} value={t.team_id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        p.team_name ?? ""
                      )}
                    </td>
                  )}
                  <td className="nowrap">{fmt(p.registered_at)}</td>
                  {isHR && (
                    <td className="actions">
                      {!ended && (
                        <button
                          className="small-button danger"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Remove ${p.full_name} from this activity?`)) {
                              run(() => deleteJson(`/activities/${id}/participants/${p.employee_id}`));
                            }
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {participants.length === 0 && <p className="empty">Nobody has registered yet.</p>}
        </section>
      ) : (
        <p className="muted">{activity.registered} registered so far.</p>
      )}
    </div>
  );
}