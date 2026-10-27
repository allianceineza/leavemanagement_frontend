import type { IconName } from "./Icon";

export interface NavSubItem {
  label: string;
  to: string;
  // The sub item is highlighted for every path that starts with one of these
  prefixes?: string[];
}

export interface NavItem {
  label: string;
  to?: string;
  // The item is highlighted for every path that starts with this (defaults to "to")
  prefix?: string;
  icon: IconName;
  roles: string[];
  soon?: boolean;
  children?: NavSubItem[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const ALL = ["Employee", "Manager", "HR", "Chief"];

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Overview", to: "/manage", icon: "grid", roles: ["HR"] },
      {
        label: "Employee management",
        to: "/employees",
        icon: "users",
        roles: ["HR", "Manager", "Chief"],
      },
      { label: "Leave management", to: "/leave-management", icon: "calendar", roles: ["HR"] },
      { label: "Leave approvals", to: "/dashboard", icon: "check", roles: ["Manager", "Chief"] },
      {
        label: "Recruitment management",
        to: "/recruitment",
        icon: "briefcase",
        roles: ["HR", "Chief"],
      },
      {
        label: "Payroll management",
        to: "/payroll/runs",
        prefix: "/payroll",
        icon: "payroll",
        roles: ["HR"],
        children: [
          {
            label: "Payroll runs",
            to: "/payroll/runs",
            prefixes: ["/payroll/runs", "/payroll/payslips"],
          },
          {
            label: "Salaries",
            to: "/payroll/salaries",
            prefixes: ["/payroll/salaries", "/payroll/employees"],
          },
          { label: "Pay components", to: "/payroll/components" },
        ],
      },
      {
        label: "Award management",
        to: "/awards",
        prefix: "/awards",
        icon: "check",
        roles: ["HR", "Manager", "Chief"],
      },
      {
        label: "Sports and activities",
        to: "/activities",
        prefix: "/activities",
        icon: "users",
        roles: ALL,
      },
      { label: "Settings", to: "/settings", icon: "settings", roles: ["HR"] },
    ],
  },
  {
    title: "My account",
    items: [
      { label: "My leave", to: "/my-leave", icon: "calendar", roles: ALL },
      { label: "My payslips", to: "/my-payslips", icon: "file", roles: ALL },
      { label: "My awards", to: "/my-awards", icon: "check", roles: ALL },
      { label: "My activities", to: "/my-activities", icon: "calendar", roles: ALL },
      { label: "My profile", to: "/profile", icon: "user", roles: ALL },
      { label: "Change password", to: "/change-password", icon: "lock", roles: ALL },
    ],
  },
];