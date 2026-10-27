import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJson, postJson, putJson } from "../../api";
import { CATEGORIES, localNowInput, toInput } from "./ActivityHelpers";

interface ActivityData {
  title: string;
  category: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  registration_deadline: string | null;
  max_participants: number | null;
  uses_teams: number;
}

const EMPTY = {
  title: "",
  category: "Sport",
  location: "",
  startsAt: "",
  endsAt: "",
  registrationDeadline: "",
  maxParticipants: "",
  usesTeams: false,
  description: "",
};

export default function ActivityForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [loaded, setLoaded] = useState(!isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    getJson<{ data: ActivityData }>(`/activities/${id}`)
      .then(({ data: a }) => {
        setForm({
          title: a.title,
          category: a.category,
          location: a.location ?? "",
          startsAt: toInput(a.starts_at),
          endsAt: toInput(a.ends_at),
          registrationDeadline: toInput(a.registration_deadline),
          maxParticipants: a.max_participants === null ? "" : String(a.max_participants),
          usesTeams: Number(a.uses_teams) === 1,
          description: a.description ?? "",
        });
        setLoaded(true);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the activity"));
  }, [id, isEdit]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (!form.startsAt) {
      setError("Please choose the start date and time.");
      return;
    }
    if (!isEdit && new Date(form.startsAt).getTime() < Date.now()) {
      setError("The start time must be in the future.");
      return;
    }
    if (form.endsAt && form.endsAt < form.startsAt) {
      setError("The end cannot be before the start.");
      return;
    }
    if (form.registrationDeadline && form.registrationDeadline > form.startsAt) {
      setError("The registration deadline cannot be after the start.");
      return;
    }
    if (form.maxParticipants !== "") {
      const n = Number(form.maxParticipants);
      if (!Number.isInteger(n) || n < 1 || n > 10000) {
        setError("The participant limit must be a whole number from 1 to 10000, or empty for no limit.");
        return;
      }
    }

    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        category: form.category,
        location: form.location.trim(),
        startsAt: form.startsAt,
        endsAt: form.endsAt,
        registrationDeadline: form.registrationDeadline,
        maxParticipants: form.maxParticipants,
        usesTeams: form.usesTeams,
        description: form.description.trim(),
      };
      if (isEdit) {
        const res = await putJson<{ message: string }>(`/activities/${id}`, body);
        navigate(`/activities/${id}`, { state: { message: res.message } });
      } else {
        const res = await postJson<{ message: string; activity_id: number }>("/activities", body);
        navigate(`/activities/${res.activity_id}`, { state: { message: res.message } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the activity");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <form className="card wide" onSubmit={submit}>
        <h1>{isEdit ? "Edit activity" : "Add activity"}</h1>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {loaded && (
          <>
            <div className="form-grid">
              <div>
                <label htmlFor="acTitle">
                  Title <span className="required" aria-hidden="true">*</span>
                </label>
                <input id="acTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label htmlFor="acCat">Category</label>
                <select id="acCat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="acLoc">Location</label>
                <input id="acLoc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label htmlFor="acStart">
                  Starts <span className="required" aria-hidden="true">*</span>
                </label>
                <input
                  id="acStart"
                  type="datetime-local"
                  min={isEdit ? undefined : localNowInput()}
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="acEnd">Ends (optional)</label>
                <input
                  id="acEnd"
                  type="datetime-local"
                  min={form.startsAt || undefined}
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="acDeadline">Registration deadline (optional)</label>
                <input
                  id="acDeadline"
                  type="datetime-local"
                  max={form.startsAt || undefined}
                  value={form.registrationDeadline}
                  onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
                />
                <p className="hint">Without a deadline, registration stays open until the start.</p>
              </div>
              <div>
                <label htmlFor="acMax">Participant limit (optional)</label>
                <input
                  id="acMax"
                  inputMode="numeric"
                  value={form.maxParticipants}
                  onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
                />
                <p className="hint">Leave empty for no limit.</p>
              </div>
              <div>
                <label htmlFor="acTeams">
                  <input
                    id="acTeams"
                    type="checkbox"
                    checked={form.usesTeams}
                    onChange={(e) => setForm({ ...form, usesTeams: e.target.checked })}
                  />{" "}
                  This activity uses teams
                </label>
                <p className="hint">You create the teams and assign people after they register.</p>
              </div>
              <div className="full">
                <label htmlFor="acDesc">Description</label>
                <textarea
                  id="acDesc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            <div className="filters">
              <button type="submit" className="submit" disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Save changes" : "Create activity"}
              </button>
              <button
                type="button"
                className="small-button secondary"
                onClick={() => navigate(isEdit ? `/activities/${id}` : "/activities")}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}