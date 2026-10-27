import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { getJson, patchJson } from "../../api";
import StatusBadge from "../StatusBadge";

interface Profile {
  employee_code: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  national_id: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  department_name: string;
  job_title: string | null;
  hire_date: string;
  manager_name: string | null;
  status: string;
  role: string | null;
}
interface AwardRow {
  award_id: number;
  award_date: string;
  reason: string;
  award_name: string;
}

export default function MyProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [form, setForm] = useState({ phone: "", address: "" });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwMessage, setPwMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function load() {
    try {
      const res = await getJson<{ data: Profile }>("/employees/me");
      setProfile(res.data);
      setForm({ phone: res.data.phone ?? "", address: res.data.address ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    getJson<{ data: AwardRow[] }>("/awards/my")
      .then((res) => setAwards(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAwards([]));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (form.phone.trim() && !/^[0-9+\-\s()]{7,30}$/.test(form.phone.trim())) {
      setError("The phone number is not valid.");
      return;
    }

    setSaving(true);
    try {
      const res = await patchJson<{ message: string }>("/employees/me", {
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      setMessage(res.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your details");
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwMessage("");

    if (!pw.current || !pw.next) {
      setPwError("Enter your current password and a new password.");
      return;
    }
    if (pw.next.length < 8) {
      setPwError("The new password must be at least 8 characters.");
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwError("The new passwords do not match.");
      return;
    }

    setSavingPw(true);
    try {
      const res = await patchJson<{ message: string }>("/employees/me/password", {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setPwMessage(res.message);
      setPw({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not change your password");
    } finally {
      setSavingPw(false);
    }
  }

  const rows: [string, string | null][] = profile
    ? [
        ["Employee code", profile.employee_code],
        ["Email", profile.email],
        ["Department", profile.department_name],
        ["Job title", profile.job_title],
        ["Hire date", profile.hire_date],
        ["Manager", profile.manager_name],
        ["Login role", profile.role],
        ["Gender", profile.gender],
        ["Date of birth", profile.date_of_birth],
        ["National ID", profile.national_id],
      ]
    : [];

  return (
    <div className="dashboard">
      <h1 className="page-title">My profile</h1>
      <p className="page-subtitle">
        You can update your phone, address and password. For anything else, please contact HR.
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && <p className="success">{message}</p>}

      {profile && (
        <>
          <section>
            <h2>
              {profile.full_name} <StatusBadge status={profile.status} />
            </h2>
            <table>
              <tbody>
                {rows.map(([label, value]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    <td>{value || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>My awards ({awards.length})</h2>
            {awards.length === 0 ? (
              <p className="empty">You have not received an award yet.</p>
            ) : (
              <>
                <ul>
                  {awards.slice(0, 5).map((a) => (
                    <li key={a.award_id}>
                      <strong>{a.award_name}</strong>, {String(a.award_date).slice(0, 10)}
                    </li>
                  ))}
                </ul>
                <p>
                  <Link to="/my-awards">See all my awards</Link>
                </p>
              </>
            )}
          </section>

          <section>
            <h2>My contact details</h2>
            <form onSubmit={handleSubmit} className="request-form">
              <div className="form-grid">
                <div>
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="address">Address</label>
                  <input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="submit" disabled={saving}>
                {saving ? "Saving..." : "Save my details"}
              </button>
            </form>
          </section>

          <section>
            <h2>Change my password</h2>
            {pwError && (
              <p className="error" role="alert">
                {pwError}
              </p>
            )}
            {pwMessage && <p className="success">{pwMessage}</p>}
            <form onSubmit={handlePassword} className="request-form">
              <div className="form-grid">
                <div>
                  <label htmlFor="currentPassword">Current password</label>
                  <input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    value={pw.current}
                    onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="newPassword">New password</label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    value={pw.next}
                    onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  />
                  <p className="hint">At least 8 characters.</p>
                </div>
                <div>
                  <label htmlFor="confirmPassword">Confirm new password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={pw.confirm}
                    onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="submit" disabled={savingPw}>
                {savingPw ? "Changing..." : "Change password"}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}