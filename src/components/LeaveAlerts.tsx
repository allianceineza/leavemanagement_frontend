import { useEffect, useState } from "react";

interface Req {
  type_name: string;
  start_date: string;
  end_date: string;
  number_of_days: number;
  status: string;
}
interface Bal {
  type_name: string;
  days_allocated: number;
  days_remaining: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

function span(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  return `${d}d ${pad(h)}h ${pad(m)}m ${pad(t % 60)}s`;
}

// Leave starts at the beginning of its first day and ends at the end of its last day
const startOf = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00`).getTime();
const endOf = (d: string) => new Date(`${d.slice(0, 10)}T23:59:59`).getTime();

export default function LeaveAlerts({ requests, balances }: { requests: Req[]; balances: Bal[] }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const approved = requests.filter((r) => r.status === "Approved");
  const current = approved.find((r) => startOf(r.start_date) <= now && now <= endOf(r.end_date));
  const upcoming = approved
    .filter((r) => startOf(r.start_date) > now)
    .sort((a, b) => startOf(a.start_date) - startOf(b.start_date));
  const next = upcoming[0];
  const low = balances.filter((b) => b.days_allocated > 0 && b.days_remaining <= 3);

  if (!current && !next && low.length === 0) return null;

  return (
    <section>
      {current && (
        <p className="info">
          <strong>You are on {current.type_name} leave.</strong> It ends in{" "}
          <strong>{span(endOf(current.end_date) - now)}</strong> (last day {current.end_date.slice(0, 10)}).
        </p>
      )}
      {next && (
        <p className={startOf(next.start_date) - now < 24 * 3600 * 1000 ? "warning" : "info"}>
          Your <strong>{next.type_name}</strong> leave starts in{" "}
          <strong>{span(startOf(next.start_date) - now)}</strong> (from {next.start_date.slice(0, 10)},{" "}
          {next.number_of_days} working day{next.number_of_days === 1 ? "" : "s"}).
          {upcoming.length > 1 ? ` ${upcoming.length - 1} more approved leave after this one.` : ""}
        </p>
      )}
      {low.map((b) => (
        <p className="warning" key={b.type_name}>
          {b.days_remaining <= 0
            ? `You have no ${b.type_name} leave days left this year.`
            : `Only ${b.days_remaining} ${b.type_name} leave day${b.days_remaining === 1 ? "" : "s"} left this year.`}
        </p>
      ))}
    </section>
  );
}