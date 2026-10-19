import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import ManageDashboard from "./components/ManageDashboard";
import Myleave from "./components/Myleave";
import Employees from "./components/employeecomponents/Employees";
import EmployeeNew from "./components/employeecomponents/EmployeeNew";
import EmployeeDetails from "./components/employeecomponents/EmployeeDetails";
import EmployeeEdit from "./components/employeecomponents/EmployeeEdit";
import MyProfile from "./components/employeecomponents/Myprofile";
import Vacancies from "./components/recruitmentcomponents/Vacancies";
import VacancyForm from "./components/recruitmentcomponents/VacancyForm";
import VacancyDetails from "./components/recruitmentcomponents/VacancyDetails";
import ApplicationDetails from "./components/recruitmentcomponents/ApplicationDetails";
import MyPayslips from "./components/payrollcomponents/MyPayslips";
import PayrollSalaries from "./components/payrollcomponents/PayrollSalaries";
import PayComponents from "./components/payrollcomponents/PayComponents";
import EmployeePayroll from "./components/payrollcomponents/EmployeePayroll";
import PayrollRuns from "./components/payrollcomponents/PayrollRuns";
import PayrollRunDetails from "./components/payrollcomponents/PayrollRunDetails";
import PayslipView from "./components/payrollcomponents/PayslipView";
import Settings from "./components/settingcomponents/Settings";
import AppLayout from "./components/layout/AppLayout";
import HROverview from "./components/HROverview";
import "./App.css";

// Every page inside this layout needs a login, and shows the sidebar
function ProtectedLayout() {
  if (!localStorage.getItem("token")) return <Navigate to="/login" />;
  if (localStorage.getItem("mustChangePassword") === "1") {
    return <Navigate to="/change-password" />;
  }
  return <AppLayout />;
}

function HROnly({ children }: { children: ReactElement }) {
  return localStorage.getItem("role") === "HR" ? children : <Navigate to="/dashboard" />;
}

// HR, Chief and Manager may view these pages; plain Employees are sent back to the dashboard
function StaffOnly({ children }: { children: ReactElement }) {
  const role = localStorage.getItem("role");
  return role === "HR" || role === "Chief" || role === "Manager" ? (
    children
  ) : (
    <Navigate to="/dashboard" />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedLayout />}>
        {/* Everyone */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/my-leave" element={<Myleave />} />
        <Route path="/profile" element={<MyProfile />} />
        <Route path="/my-payslips" element={<MyPayslips />} />

        {/* HR overview, leave management and settings */}
        <Route
          path="/manage"
          element={
            <HROnly>
              <HROverview />
            </HROnly>
          }
        />
        <Route
          path="/leave-management"
          element={
            <HROnly>
              <ManageDashboard />
            </HROnly>
          }
        />
        <Route
          path="/settings"
          element={
            <HROnly>
              <Settings />
            </HROnly>
          }
        />

        {/* Employees */}
        <Route
          path="/employees"
          element={
            <StaffOnly>
              <Employees />
            </StaffOnly>
          }
        />
        <Route
          path="/employees/new"
          element={
            <HROnly>
              <EmployeeNew />
            </HROnly>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <StaffOnly>
              <EmployeeDetails />
            </StaffOnly>
          }
        />
        <Route
          path="/employees/:id/edit"
          element={
            <HROnly>
              <EmployeeEdit />
            </HROnly>
          }
        />

        {/* Recruitment */}
        <Route
          path="/recruitment"
          element={
            <StaffOnly>
              <Vacancies />
            </StaffOnly>
          }
        />
        <Route
          path="/recruitment/new"
          element={
            <HROnly>
              <VacancyForm />
            </HROnly>
          }
        />
        <Route
          path="/recruitment/:id"
          element={
            <StaffOnly>
              <VacancyDetails />
            </StaffOnly>
          }
        />
        <Route
          path="/recruitment/:id/edit"
          element={
            <HROnly>
              <VacancyForm />
            </HROnly>
          }
        />
        <Route
          path="/recruitment/applications/:id"
          element={
            <StaffOnly>
              <ApplicationDetails />
            </StaffOnly>
          }
        />

        {/* Payroll */}
        <Route
          path="/payroll/salaries"
          element={
            <HROnly>
              <PayrollSalaries />
            </HROnly>
          }
        />
        <Route
          path="/payroll/components"
          element={
            <HROnly>
              <PayComponents />
            </HROnly>
          }
        />
        <Route
          path="/payroll/employees/:id"
          element={
            <HROnly>
              <EmployeePayroll />
            </HROnly>
          }
        />
        <Route
          path="/payroll/runs"
          element={
            <HROnly>
              <PayrollRuns />
            </HROnly>
          }
        />
        <Route
          path="/payroll/runs/:id"
          element={
            <HROnly>
              <PayrollRunDetails />
            </HROnly>
          }
        />
        <Route
          path="/payroll/payslips/:id"
          element={
            <HROnly>
              <PayslipView />
            </HROnly>
          }
        />
      </Route>
    </Routes>
  );
}