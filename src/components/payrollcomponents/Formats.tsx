export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Navigation for the HR payroll pages
export const payrollLinks = [
  { to: "/manage", label: "HR management" },
  { to: "/payroll/runs", label: "Payroll runs" },
  { to: "/payroll/salaries", label: "Salaries" },
  { to: "/payroll/components", label: "Pay components" },
  { to: "/my-payslips", label: "My payslips" },
];

export function isMoney(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}