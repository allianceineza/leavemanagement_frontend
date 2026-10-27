import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getJson, postJson } from "../../api";
import AppHeader from "../AppHeader";
import { awardLinks, localToday } from "./AwardHelpers";

interface Person {
  employee_id: number;
  full_name: string;
  employee_code: string | null;
  department_name: string;
}
interface AwardType {
  award_type_id: number;
  name: string;
  description: string | null;
}

export default function AwardForm() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Person | null>(null);
  const [types, setTypes] = useState<AwardType[]>([]);
  const [form, setForm] = useState({ awardTypeId: "", awardDate: localToday(), reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getJson<{ data: AwardType[] }>("/awards/types")
      .then((res) => setTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load the award types."));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      getJson<{ data: Person[] }>(
        `/employees?status=Active&limit=20&search=${encodeURIComponent(query)}`
      )
        .then((res) => setPeople(Array.isArray(res.data) ? res.data : []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Keep the chosen person in the list even when a new search no longer returns them
  const options = picked && !people.some((p) => p.employee_id === picked.employee_id) ? [picked, ...people] : people;
  const chosenType = types.find((t) => String(t.award_type_id) === form.awardTypeId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!picked) {
      setError("Please choose an employee.");
      return;
    }
    if (!form.awardTypeId) {
      setError("Please choose an award.");
      return;
    }
    if (form.awardDate > localToday()) {
      setError("The award date cannot be in the future.");
      return;
    }
    if (form.reason.trim().length < 3) {
      setError("Please give the reason for the award (at least 3 characters).");
      return;
    }

    setSaving(true);
    try {
      const res = await postJson<{ message: string }>("/awards", {
        employeeId: picked.employee_id,
        awardTypeId: Number(form.awardTypeId),
        awardDate: form.awardDate,
        reason: form.reason.trim(),
      });
      navigate("/awards", {
        state: { message: `${res.message}: ${chosenType?.name ?? "Award"} for ${picked.full_name}.` },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not give the award");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppHeader links={awardLinks("HR")} />
      <div className="page">
        <form className="card wide" onSubmit={submit}>
          <h1>Give an award</h1>
          <p className="muted">The reason is shown to the employee, so write it with that in mind.</p>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <div className="form-grid">
            <div>
              <label htmlFor="awFind">
                Find the employee <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="awFind"
                placeholder="Type a name or employee code"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="awPerson">
                Employee <span className="required" aria-hidden="true">*</span>
              </label>
              <select
                id="awPerson"
                value={picked ? String(picked.employee_id) : ""}
                onChange={(e) =>
                  setPicked(options.find((p) => String(p.employee_id) === e.target.value) ?? null)
                }
              >
                <option value="">Choose from the results</option>
                {options.map((p) => (
                  <option key={p.employee_id} value={p.employee_id}>
                    {p.full_name} ({p.employee_code ?? "no code"}), {p.department_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="awType">
                Award <span className="required" aria-hidden="true">*</span>
              </label>
              <select
                id="awType"
                value={form.awardTypeId}
                onChange={(e) => setForm({ ...form, awardTypeId: e.target.value })}
              >
                <option value="">Choose an award</option>
                {types.map((t) => (
                  <option key={t.award_type_id} value={t.award_type_id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {chosenType?.description && <p className="hint">{chosenType.description}</p>}
            </div>
            <div>
              <label htmlFor="awDate">Date</label>
              <input
                id="awDate"
                type="date"
                max={localToday()}
                value={form.awardDate}
                onChange={(e) => setForm({ ...form, awardDate: e.target.value })}
              />
            </div>
            <div className="full">
              <label htmlFor="awReason">
                Reason <span className="required" aria-hidden="true">*</span>
              </label>
              <textarea
                id="awReason"
                rows={4}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
          </div>

          {types.length === 0 && (
            <p className="muted">There are no award types yet. Add one under Award types first.</p>
          )}

          <div className="filters">
            <button type="submit" className="submit" disabled={saving}>
              {saving ? "Saving..." : "Give award"}
            </button>
            <button type="button" className="small-button secondary" onClick={() => navigate("/awards")}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}