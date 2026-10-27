import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJson } from "../../api";
import StatusBadge from "../StatusBadge";
import { fmt } from "./ActivityHelpers";

interface Mine {
  activity_id: number;
  title: string;
  category: string;
  location: string | null;
  starts_at: string;
  status: string;
  team_name: string | null;
}

export default function MyActivities() {
  const [rows, setRows] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getJson<{ data: Mine[] }>("/activities/my")
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard">
      <h1 className="page-title">My activities</h1>
      <p className="page-subtitle">Activities you are registered for.</p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section>
        <table>
          <thead>
            <tr>
              <th>Activity</th>
              <th>Starts</th>
              <th>Where</th>
              <th>Team</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.activity_id}>
                <td>
                  <div className="person-name">
                    <Link to={`/activities/${a.activity_id}`}>{a.title}</Link>
                  </div>
                  <div className="person-email">{a.category}</div>
                </td>
                <td className="nowrap">{fmt(a.starts_at)}</td>
                <td>{a.location ?? ""}</td>
                <td>{a.team_name ?? ""}</td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="muted">Loading...</p>}
        {!loading && rows.length === 0 && (
          <p className="empty">You have not registered for any activity yet.</p>
        )}
      </section>
    </div>
  );
}