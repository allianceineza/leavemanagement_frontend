import { Routes, Route, Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import ManageDashboard from "./components/ManageDashboard";
import Myleave from "./components/Myleave";
import Employees from "./components/employeecomponents/Employees";
import EmployeeNew from "./components/employeecomponents/EmployeeNew";
import "./App.css";

function Protected({ children }: { children: ReactElement }) {
  return localStorage.getItem("token") ? children : <Navigate to="/login" />;
}

function HROnly({ children }: { children: ReactElement }) {
  if (!localStorage.getItem("token")) return <Navigate to="/login" />;
  return localStorage.getItem("role") === "HR" ? children : <Navigate to="/dashboard" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/employees" element={<Employees />} />
      
      <Route
        path="/dashboard"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/my-leave"
        element={
          <Protected>
            <Myleave />
          </Protected>
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
        path="/manage"
        element={
          <HROnly>
            <ManageDashboard />
          </HROnly>
        }
      />
    </Routes>
  );
}