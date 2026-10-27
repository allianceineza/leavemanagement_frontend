import { useEffect, useState } from "react";
import { timeOf } from "../activitycomponents/ActivityHelpers";

const pad = (n: number) => String(n).padStart(2, "0");

export default function ActivityCountdown({
  closesAt,
  status,
}: {
  closesAt: string | null;
  status: string;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (status !== "Open") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status]);

  if (status !== "Open") return <span className="muted">{status}</span>;
  if (!closesAt) return <span className="muted">No deadline</span>;

  const diff = timeOf(closesAt) - now;
  if (!(diff > 0)) return <span style={{ color: "#b91c1c", fontWeight: 600 }}>Registration closed</span>;

  const t = Math.floor(diff / 1000);
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const urgent = diff < 24 * 3600 * 1000;

  return (
    <span
      style={{
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        color: urgent ? "#b45309" : undefined,
      }}
    >
      {d}d {pad(h)}h {pad(m)}m {pad(t % 60)}s
    </span>
  );
}