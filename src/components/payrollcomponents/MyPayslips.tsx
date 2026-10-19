import { useEffect, useState } from "react";
import { getJson } from "../../api";
import AppHeader from "../AppHeader";
import { MONTHS, money } from "./Formats";

interface SlipRow {
  payslip_id: number;
  period_year: number;
  period_month: number;
  paid_at: string | null;
  basic_salary: number;
  total_allowances: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
}
interface SlipItem {
  component_name: string;
  type: string;
  calc_type: string;
  rate: number;
  amount: number;
}
interface SlipDetail extends SlipRow {
  employee_name: string;
  employee_code: string | null;
  department_name: string | null;
  job_title: string | null;
  approved_at: string | null;
  items: SlipItem[];
}
interface MySalary {
  basic_salary: number | null;
  effective_from?: string;
  items: { name: string; type: string; calc_type: string; rate: number; amount: number }[];
  total_allowances: number;
  total_deductions: number;
  gross_pay: number;
  net_pay: number;
}

type PayState = "Pending" | "Paid" | "Active";

// Pending: approved, payment in process. Paid: a past month that was paid. Active: this month, paid.
function payStatus(paidAt: string | null, year: number, month: number): PayState {
  if (!paidAt) return "Pending";
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1 ? "Active" : "Paid";
}

const PILL: Record<PayState, { bg: string; fg: string }> = {
  Pending: { bg: "#fef3c7", fg: "#92400e" },
  Paid: { bg: "#dcfce7", fg: "#166534" },
  Active: { bg: "#dbeafe", fg: "#1e40af" },
};

function Pill({ state }: { state: PayState }) {
  return (
    <span
      style={{
        background: PILL[state].bg,
        color: PILL[state].fg,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {state}
    </span>
  );
}

function headerLinks(role: string | null) {
  if (role === "HR") {
    return [
      { to: "/manage", label: "HR management" },
      { to: "/profile", label: "My profile" },
    ];
  }
  if (role === "Manager" || role === "Chief") {
    return [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/profile", label: "My profile" },
      { to: "/my-leave", label: "My own leave" },
    ];
  }
  return [
    { to: "/profile", label: "My profile" },
    { to: "/my-leave", label: "My leave" },
  ];
}

export default function MyPayslips() {
  const [rows, setRows] = useState<SlipRow[]>([]);
  const [salary, setSalary] = useState<MySalary | null>(null);
  const [open, setOpen] = useState<SlipDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<{ data: SlipRow[] }>("/payroll/my-payslips")
      .then((res) => setRows(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
    getJson<{ data: MySalary }>("/payroll/my-salary")
      .then((res) => setSalary(res.data))
      .catch(() => {});
  }, []);

  async function view(id: number) {
    setError("");
    try {
      const res = await getJson<{ data: SlipDetail }>(`/payroll/payslips/${id}`);
      setOpen(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the payslip");
    }
  }

  const allowances = open ? open.items.filter((i) => i.type === "Allowance") : [];
  const deductions = open ? open.items.filter((i) => i.type === "Deduction") : [];
  const basis = (calc: string, rate: number) => (calc === "Percent" ? `${rate}% of basic` : "Fixed");

  return (
    <>
      <AppHeader links={headerLinks(localStorage.getItem("role"))} />
      <div className="dashboard">
        <h1 className="page-title">My payslips</h1>
        <p className="page-subtitle">Your salary and payslips. Only you and HR can see them.</p>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {!open && salary && (
          <section>
            <h2>My salary now</h2>
            {salary.basic_salary === null ? (
              <p className="muted">Your basic salary has not been set yet. Please contact HR.</p>
            ) : (
              <>
                <table>
                  <tbody>
                    <tr>
                      <th>Basic salary</th>
                      <td>{money(salary.basic_salary)}</td>
                    </tr>
                    {salary.items
                      .filter((i) => i.type === "Allowance")
                      .map((i, idx) => (
                        <tr key={`a${idx}`}>
                          <th>{i.name}</th>
                          <td>
                            + {money(i.amount)}{" "}
                            <span className="muted">({basis(i.calc_type, i.rate)})</span>
                          </td>
                        </tr>
                      ))}
                    <tr>
                      <th>Gross pay</th>
                      <td>
                        <strong>{money(salary.gross_pay)}</strong>
                      </td>
                    </tr>
                    {salary.items
                      .filter((i) => i.type === "Deduction")
                      .map((i, idx) => (
                        <tr key={`d${idx}`}>
                          <th>{i.name}</th>
                          <td>
                            − {money(i.amount)}{" "}
                            <span className="muted">({basis(i.calc_type, i.rate)})</span>
                          </td>
                        </tr>
                      ))}
                    <tr>
                      <th>Estimated net pay</th>
                      <td>
                        <strong>{money(salary.net_pay)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p className="muted">
                  This is an estimate from your current salary and allowances. Your official payslip
                  appears below once HR approves the month.
                </p>
              </>
            )}
          </section>
        )}

        {!open && (
          <section>
            <h2>My payslips</h2>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Basic salary</th>
                  <th>Allowances</th>
                  <th>Gross pay</th>
                  <th>Deductions</th>
                  <th>Net pay</th>
                  <th>Payment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.payslip_id}>
                    <td>
                      {MONTHS[r.period_month - 1]} {r.period_year}
                    </td>
                    <td>{money(r.basic_salary)}</td>
                    <td>{money(r.total_allowances)}</td>
                    <td>{money(r.gross_pay)}</td>
                    <td>{money(r.total_deductions)}</td>
                    <td>
                      <strong>{money(r.net_pay)}</strong>
                    </td>
                    <td>
                      <Pill state={payStatus(r.paid_at, r.period_year, r.period_month)} />
                    </td>
                    <td className="actions">
                      <button className="small-button secondary" onClick={() => view(r.payslip_id)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <p className="muted">Loading...</p>}
            {!loading && rows.length === 0 && (
              <p className="empty">You have no payslips yet. They appear once HR approves the month's payroll.</p>
            )}
            <p className="muted">
              Pending: approved, payment in process. Paid: a past month that has been paid. Active: the
              current month, paid.
            </p>
          </section>
        )}

        {open && (
          <section>
            <div className="filters">
              <button className="small-button secondary" onClick={() => setOpen(null)}>
                Back to my payslips
              </button>
              <button className="small-button" onClick={() => window.print()}>
                Print / Save as PDF
              </button>
            </div>

            <h2>
              Payslip for {MONTHS[open.period_month - 1]} {open.period_year}{" "}
              <Pill state={payStatus(open.paid_at, open.period_year, open.period_month)} />
            </h2>
            <table>
              <tbody>
                <tr>
                  <th>Employee</th>
                  <td>
                    {open.employee_name} {open.employee_code ? `(${open.employee_code})` : ""}
                  </td>
                </tr>
                <tr>
                  <th>Department</th>
                  <td>{open.department_name ?? ""}</td>
                </tr>
                <tr>
                  <th>Job title</th>
                  <td>{open.job_title ?? ""}</td>
                </tr>
                <tr>
                  <th>Approved on</th>
                  <td>{open.approved_at ?? ""}</td>
                </tr>
                <tr>
                  <th>Paid on</th>
                  <td>{open.paid_at ? String(open.paid_at).slice(0, 16) : "Not paid yet"}</td>
                </tr>
              </tbody>
            </table>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Basis</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic salary</td>
                  <td></td>
                  <td>{money(open.basic_salary)}</td>
                </tr>
                {allowances.map((i, idx) => (
                  <tr key={`a${idx}`}>
                    <td>{i.component_name}</td>
                    <td>{basis(i.calc_type, i.rate)}</td>
                    <td>+ {money(i.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <th>Gross pay</th>
                  <td></td>
                  <th>{money(open.gross_pay)}</th>
                </tr>
                {deductions.map((i, idx) => (
                  <tr key={`d${idx}`}>
                    <td>{i.component_name}</td>
                    <td>{basis(i.calc_type, i.rate)}</td>
                    <td>− {money(i.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <th>Total deductions</th>
                  <td></td>
                  <th>{money(open.total_deductions)}</th>
                </tr>
                <tr>
                  <th>Net pay</th>
                  <td></td>
                  <th>{money(open.net_pay)}</th>
                </tr>
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}