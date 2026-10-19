import { useEffect, useState } from "react";

interface Props {
  closingDate: string | null;
  active?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown({ closingDate, active = true }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!closingDate || !active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [closingDate, active]);

  if (!active) return <span className="muted">Not accepting applications</span>;
  if (!closingDate) return <span className="muted">No deadline</span>;

  // The vacancy closes at the end of the closing date, in this computer's time
  const diff = new Date(`${closingDate.slice(0, 10)}T23:59:59`).getTime() - now;
  if (diff <= 0) {
    return <span style={{ color: "#b91c1c", fontWeight: 600 }}>Applications closed</span>;
  }

  const total = Math.floor(diff / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const urgent = diff < 24 * 3600 * 1000;

  return (
    <span
      style={{
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        color: urgent ? "#b45309" : undefined,
      }}
    >
      {days}d {pad(hours)}h {pad(minutes)}m {pad(seconds)}s
    </span>
  );
}