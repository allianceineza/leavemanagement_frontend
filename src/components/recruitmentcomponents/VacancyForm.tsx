import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJson, postJson, putJson } from "../../api";
import AppHeader from "../AppHeader";

interface Department {
  department_id: number;
  department_name: string;
}
interface VacancyData {
  title: string;
  department_id: number;
  openings: number;
  closing_date: string | null;
  description: string | null;
  requirements: string | null;
}

export default function VacancyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({
    title: "",
    departmentId: "",
    openings: "1",
    closingDate: "",
    description: "",
    requirements: "",
  });
  const [loaded, setLoaded] = useState(!isEdit);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
    if (isEdit) {
      getJson<{ data: VacancyData }>(`/recruitment/vacancies/${id}`)
        .then(({ data: v }) => {
          setForm({
            title: v.title,
            departmentId: String(v.department_id),
            openings: String(v.openings),
            closingDate: v.closing_date ?? "",
            description: v.description ?? "",
            requirements: v.requirements ?? "",
          });
          setLoaded(true);
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Could not load the vacancy"));
    }
  }, [id, isEdit]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Please enter the job title.");
      return;
    }
    if (!form.departmentId) {
      setError("Please choose a department.");
      return;
    }
    const openings = Number(form.openings);
    if (!Number.isInteger(openings) || openings < 1 || openings > 100) {
      setError("Openings must be a whole number from 1 to 100.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        departmentId: Number(form.departmentId),
        openings,
        closingDate: form.closingDate,
        description: form.description.trim(),
        requirements: form.requirements.trim(),
      };
      if (isEdit) {
        const res = await putJson<{ message: string }>(`/recruitment/vacancies/${id}`, body);
        navigate(`/recruitment/${id}`, { state: { message: res.message } });
      } else {
        const res = await postJson<{ message: string; vacancy_id: number }>(
          "/recruitment/vacancies",
          body
        );
        navigate(`/recruitment/${res.vacancy_id}`, { state: { message: res.message } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the vacancy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppHeader links={[{ to: "/recruitment", label: "Back to vacancies" }]} />
      <div className="page">
        <form className="card wide" onSubmit={handleSubmit}>
          <h1>{isEdit ? "Edit vacancy" : "Add vacancy"}</h1>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {loaded && (
            <>
              <div className="form-grid">
                <div>
                  <label htmlFor="title">
                    Job title <span className="required" aria-hidden="true">*</span>
                  </label>
                  <input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="department">
                    Department <span className="required" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="department"
                    value={form.departmentId}
                    onChange={(e) => update("departmentId", e.target.value)}
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
                  <label htmlFor="openings">Number of openings</label>
                  <input
                    id="openings"
                    type="number"
                    min="1"
                    max="100"
                    value={form.openings}
                    onChange={(e) => update("openings", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="closingDate">Closing date</label>
                  <input
                    id="closingDate"
                    type="date"
                    value={form.closingDate}
                    onChange={(e) => update("closingDate", e.target.value)}
                  />
                  <p className="hint">Optional. Leave empty if there is no deadline.</p>
                </div>
                <div className="full">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    rows={4}
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                  />
                </div>
                <div className="full">
                  <label htmlFor="requirements">Requirements</label>
                  <textarea
                    id="requirements"
                    rows={4}
                    value={form.requirements}
                    onChange={(e) => update("requirements", e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="submit" disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Save changes" : "Create vacancy"}
              </button>
            </>
          )}
        </form>
      </div>
    </>
  );
}