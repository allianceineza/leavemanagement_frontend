import { useEffect, useState } from "react";
import { getJson } from "../../api";
import AppHeader from "../AppHeader";
import { awardLinks } from "./AwardHelpers";

interface MyAward {
  award_id: number;
  award_date: string;
  reason: string;
  award_name: string;
  awarded_by_name: string | null;
}

export default function MyAwards() {
  const [rows, setRows] = useState<MyAward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getJson<{ data: MyAward[] }>("/awards/my")
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AppHeader links={awardLinks(localStorage.getItem("role"))} />
      <div className="dashboard">
        <h1 className="page-title">My awards</h1>
        <p className="page-subtitle">Awards you have received.</p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <section>
          <table>
            <thead>
              <tr>
                <th>Award</th>
                <th>Date</th>
                <th>Reason</th>
                <th>Given by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.award_id}>
                  <td>
                    <strong>{a.award_name}</strong>
                  </td>
                  <td className="nowrap">{String(a.award_date).slice(0, 10)}</td>
                  <td style={{ whiteSpace: "pre-wrap" }}>{a.reason}</td>
                  <td>{a.awarded_by_name ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="muted">Loading...</p>}
          {!loading && rows.length === 0 && <p className="empty">You have not received an award yet.</p>}
        </section>
      </div>
    </>
  );
}