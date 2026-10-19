import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { getJson } from "../api";
import Icon from "./layout/Icon";
import type { IconName } from "./layout/Icon";

interface Overview {
  employees: {
    total: number;
    active: number;
    new_hires: number;
    by_department: { department_name: string; headcount: number }[];
  };
  leave: {
    pending: number;
    on_leave_today: number;
    starting_soon: number;
    without_balances: number;
  };
  recruitment: {
    open_vacancies: number;
    closing_soon: number;
    open_applications: number;
    by_stage: { status: string; total: number }[];
  };
}

const STAGES = ["Applied", "Shortlisted", "Interview", "Selected", "Hired", "Rejected", "Withdrawn"];

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mini-value">{value}</div>
      <div className="mini-label">{label}</div>
    </div>
  );
}

function ModuleCard({
  title,
  icon,
  to,
  linkLabel,
  children,
}: {
  title: string;
  icon: IconName;
  to: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="module-card">
      <div className="module-head">
        <Icon name={icon} size={22} />
        <h2>{title}</h2>
        <Link to={to} className="module-link">
          {linkLabel}
        </Link>
      </div>
      {children}
    </div>
  );
}

export default function HROverview() {
  const fullName = localStorage.getItem("fullName") || "";
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getJson<Overview>("/manage/overview")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the overview"));
  }, []);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const attention: { text: string; to: string; label: string }[] = [];
  if (data) {
    if (data.leave.pending > 0) {
      attention.push({
        text: `${data.leave.pending} leave request${data.leave.pending === 1 ? "" : "s"} waiting for a decision`,
        to: "/leave-management",
        label: "Review",
      });
    }
    if (data.leave.without_balances > 0) {
      attention.push({
        text: `${data.leave.without_balances} active employee${data.leave.without_balances === 1 ? " has" : "s have"} no leave balance for this year`,
        to: "/leave-management",
        label: "Fix",
      });
    }
    const applied = data.recruitment.by_stage.find((s) => s.status === "Applied")?.total ?? 0;
    if (applied > 0) {
      attention.push({
        text: `${applied} new application${applied === 1 ? "" : "s"} waiting for screening`,
        to: "/recruitment",
        label: "Screen",
      });
    }
    if (data.recruitment.closing_soon > 0) {
      attention.push({
        text: `${data.recruitment.closing_soon} vacanc${data.recruitment.closing_soon === 1 ? "y closes" : "ies close"} within 7 days`,
        to: "/recruitment",
        label: "View",
      });
    }
  }

  const maxHeadcount = data ? Math.max(1, ...data.employees.by_department.map((d) => d.headcount)) : 1;
  const stageTotals = data
    ? STAGES.map((s) => ({ status: s, total: data.recruitment.by_stage.find((x) => x.status === s)?.total ?? 0 }))
    : [];
  const maxStage = Math.max(1, ...stageTotals.map((s) => s.total));

  return (
    <div className="dashboard">
      <h1 className="page-title">Overview</h1>
      <p className="page-subtitle">
        Welcome, {fullName}. {today}.
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="muted">Loading...</p>}

      {data && (
        <>
          <section className="attention">
            <h2>Needs your attention</h2>
            {attention.length === 0 ? (
              <p className="muted">Nothing needs your attention right now.</p>
            ) : (
              <ul>
                {attention.map((a) => (
                  <li key={a.text}>
                    <span>{a.text}</span>
                    <Link to={a.to} className="module-link">
                      {a.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="module-grid">
            <ModuleCard
              title="Employees"
              icon="users"
              to="/employees"
              linkLabel="Manage employees"
            >
              <div className="module-stats">
                <MiniStat value={data.employees.active} label="Active employees" />
                <MiniStat value={data.employees.new_hires} label="Joined in the last 30 days" />
                <MiniStat value={data.employees.total} label="All records" />
              </div>
            </ModuleCard>

            <ModuleCard
              title="Leave"
              icon="calendar"
              to="/leave-management"
              linkLabel="Open leave management"
            >
              <div className="module-stats">
                <MiniStat value={data.leave.pending} label="Pending requests" />
                <MiniStat value={data.leave.on_leave_today} label="On leave today" />
                <MiniStat value={data.leave.starting_soon} label="Starting in 30 days" />
              </div>
            </ModuleCard>

            <ModuleCard
              title="Recruitment"
              icon="briefcase"
              to="/recruitment"
              linkLabel="Open recruitment"
            >
              <div className="module-stats">
                <MiniStat value={data.recruitment.open_vacancies} label="Open vacancies" />
                <MiniStat value={data.recruitment.open_applications} label="Applications in progress" />
                <MiniStat value={data.recruitment.closing_soon} label="Closing within 7 days" />
              </div>
            </ModuleCard>

            <ModuleCard
              title="Payroll"
              icon="payroll"
              to="/payroll/runs"
              linkLabel="Open payroll"
            >
              <p className="muted">
                Payroll runs, salaries and payslips. A payroll summary will appear here in a
                later step.
              </p>
            </ModuleCard>
          </div>

          <div className="two-col">
            <section>
              <h2>Active employees by department</h2>
              {data.employees.by_department.map((d) => (
                <div key={d.department_name} className="bar-row">
                  <span>{d.department_name}</span>
                  <Bar value={d.headcount} max={maxHeadcount} />
                  <span className="count">{d.headcount}</span>
                </div>
              ))}
              {data.employees.by_department.length === 0 && (
                <p className="empty">No departments yet.</p>
              )}
            </section>

            <section>
              <h2>Recruitment pipeline (open vacancies)</h2>
              {stageTotals.map((s) => (
                <div key={s.status} className="bar-row">
                  <span>{s.status}</span>
                  <Bar value={s.total} max={maxStage} />
                  <span className="count">{s.total}</span>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}