export const CATEGORIES = ["Sport", "Social event", "Training", "Other"];

export function localNowInput(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// "2026-10-30 15:00:00" -> "2026-10-30 15:00"
export function fmt(value: string | null): string {
  return value ? value.replace("T", " ").slice(0, 16) : "";
}

// "2026-10-30 15:00:00" -> "2026-10-30T15:00" (the format a datetime-local box needs)
export function toInput(value: string | null): string {
  return value ? value.replace(" ", "T").slice(0, 16) : "";
}

export function timeOf(value: string | null): number {
  return value ? new Date(value.replace(" ", "T")).getTime() : NaN;
}