import { Link, useNavigate } from "react-router-dom";
import { BRAND } from "../branding.ts";

interface Props {
  links?: { to: string; label: string }[];
}

export default function AppHeader({ links = [] }: Props) {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "";
  const role = localStorage.getItem("role") || "";

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("fullName");
    navigate("/login");
  }

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="brand">
          {BRAND.logo && <img src={BRAND.logo} alt={`${BRAND.shortName} logo`} />}
          <span>
            {BRAND.shortName} {BRAND.systemName}
          </span>
        </div>
        <div className="user-info">
          {links.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
          <span>{fullName}</span>
          <span className="user-role">{role}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </div>
    </header>
  );
}