import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getJson, postJson, putJson } from "../../api";
import AppHeader from "../AppHeader";
import { awardLinks } from "./AwardHelpers";

interface AwardType {
  award_type_id: number;
  name: string;
  description: string | null;
  is_active: number;
  times_given: number;
}

const EMPTY = { id: null as number | null, name: "", description: "" };

export default function AwardTypes() {
  const [rows, setRows] = useState<AwardType[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getJson<{ data: AwardType[] }>("/awards/types?all=1");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(t: AwardType) {
    setError("");
    setMessage("");
    setForm({ id: t.award_type_id, name: t.name, description: t.description ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Please enter a name.");
      return;
    }

    setSaving(true);
    try {
      const body = { name: form.name.trim(), description: form.description.trim() };
      const res = form.id
        ? await putJson<{ message: string }>(`/awards/types/${form.id}`, body)
        : await postJson<{ message: string }>("/awards/types", body);
      setMessage(res.message);
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the award type");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(t: AwardType) {
    setError("");
    setMessage("");
    if (
      Number(t.is_active) &&
      !window.confirm(`Deactivate "${t.name}"? It can no longer be given. Awards already given are kept.`)
    ) {
      return;
    }
    try {
      const res = await putJson<{ message: string }>(`/awards/types/${t.award_type_id}`, {
        isActive: !Number(t.is_active),
      });
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the award type");
    }
  }

  return (
    <>
      <AppHeader links={awardLinks("HR")} />
      <div className="dashboard">
        <h1 className="page-title">Award types</h1>
        <p className="page-subtitle">The awards HR can give. Types are deactivated, never deleted.</p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && <p className="success">{message}</p>}

        <section>
          <h2>{form.id ? "Edit award type" : "Add an award type"}</h2>
          <form onSubmit={submit} className="request-form">
            <div className="form-grid">
              <div>
                <label htmlFor="atName">Name</label>
                <input id="atName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="atDesc">Description (optional)</label>
                <input
                  id="atDesc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="filters">
              <button type="submit" className="submit" disabled={saving}>
                {saving ? "Saving..." : form.id ? "Save changes" : "Add award type"}
              </button>
              {form.id && (
                <button type="button" className="small-button secondary" onClick={() => setForm(EMPTY)}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <h2>All award types</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Times given</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.award_type_id}>
                  <td>{t.name}</td>
                  <td>{t.description ?? ""}</td>
                  <td>{t.times_given}</td>
                  <td>{Number(t.is_active) ? "Active" : <span className="muted">Inactive</span>}</td>
                  <td className="actions">
                    <button className="small-button secondary" onClick={() => startEdit(t)}>
                      Edit
                    </button>
                    <button
                      className={Number(t.is_active) ? "small-button danger" : "small-button approve"}
                      onClick={() => toggle(t)}
                    >
                      {Number(t.is_active) ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="empty">No award types yet.</p>}
        </section>
      </div>
    </>
  );
}