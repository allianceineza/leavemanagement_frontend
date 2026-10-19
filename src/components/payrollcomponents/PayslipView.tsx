import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getJson } from "../../api";
import AppHeader from "../AppHeader";
import { MONTHS, money, payrollLinks } from "./Formats";

interface Item {
  component_name: string;
  type: string;
  calc_type: string;
  rate: number;
  amount: number;
}
interface Slip {
  employee_name: string;
  employee_code: string | null;
  department_name: string | null;
  job_title: string | null;
  period_year: number;
  period_month: number;
  status: string;
  approved_at: string | null;
  basic_salary: number;
  total_allowances: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  items: Item[];
}

export default function PayslipView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [slip, setSlip] = useState<Slip | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getJson<{ data: Slip }>(`/payroll/payslips/${id}`)
      .then((res) => setSlip(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"));
  }, [id]);

  const allowances = slip ? slip.items.filter((i) => i.type === "Allowance") : [];
  const deductions = slip ? slip.items.filter((i) => i.type === "Deduction") : [];

  return (
    <>
      <AppHeader links={payrollLinks} />
      <div className="dashboard">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        {slip && (
          <section>
            <div className="filters">
              <button className="small-button secondary" onClick={() => navigate(-1)}>
                Back
              </button>
              <button className="small-button" onClick={() => window.print()}>
                Print / Save as PDF
              </button>
            </div>

            <h2>
              Payslip for {MONTHS[slip.period_month - 1]} {slip.period_year}{" "}
              <span className="muted">({slip.status === "Approved" ? "Approved" : "Draft, not final"})</span>
            </h2>
            <table>
              <tbody>
                <tr>
                  <th>Employee</th>
                  <td>
                    {slip.employee_name} {slip.employee_code ? `(${slip.employee_code})` : ""}
                  </td>
                </tr>
                <tr>
                  <th>Department</th>
                  <td>{slip.department_name ?? ""}</td>
                </tr>
                <tr>
                  <th>Job title</th>
                  <td>{slip.job_title ?? ""}</td>
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
                  <td>{money(slip.basic_salary)}</td>
                </tr>
                {allowances.map((i, idx) => (
                  <tr key={`a${idx}`}>
                    <td>{i.component_name}</td>
                    <td>{i.calc_type === "Percent" ? `${i.rate}% of basic` : "Fixed"}</td>
                    <td>+ {money(i.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <th>Gross pay</th>
                  <td></td>
                  <th>{money(slip.gross_pay)}</th>
                </tr>
                {deductions.map((i, idx) => (
                  <tr key={`d${idx}`}>
                    <td>{i.component_name}</td>
                    <td>{i.calc_type === "Percent" ? `${i.rate}% of basic` : "Fixed"}</td>
                    <td>− {money(i.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <th>Total deductions</th>
                  <td></td>
                  <th>{money(slip.total_deductions)}</th>
                </tr>
                <tr>
                  <th>Net pay</th>
                  <td></td>
                  <th>{money(slip.net_pay)}</th>
                </tr>
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}