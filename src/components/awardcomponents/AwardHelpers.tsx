export function localToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function awardLinks(role: string | null) {
  if (role === "HR") {
    return [
      { to: "/manage", label: "HR management" },
      { to: "/awards", label: "Awards" },
      { to: "/awards/types", label: "Award types" },
      { to: "/my-awards", label: "My awards" },
    ];
  }
  if (role === "Manager" || role === "Chief") {
    return [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/awards", label: "Awards" },
      { to: "/my-awards", label: "My awards" },
    ];
  }
  return [
    { to: "/my-leave", label: "My leave" },
    { to: "/my-awards", label: "My awards" },
  ];
}