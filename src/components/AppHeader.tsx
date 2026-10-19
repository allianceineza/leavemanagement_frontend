import { Link, useNavigate } from "react-router-dom";
import { BRAND } from "../branding.ts";
import { useContext } from "react";
import { InLayoutContext } from "./layout/layoutContext";


interface Props {
  links?: { to: string; label: string }[];
}

export default function AppHeader({ links = [] }: Props) {
  const navigate = useNavigate();
  const fullName = localStorage.getItem("fullName") || "";
  const role = localStorage.getItem("role") || "";
  const inLayout = useContext(InLayoutContext);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("fullName");
    navigate("/login");
  }
    if (inLayout) {
    // Inside the sidebar layout only "Back ..." links are kept
    const backLinks = links.filter((l) => /^back/i.test(l.label));
    if (backLinks.length === 0) return null;
    return (
      <div className="back-links">
        {backLinks.map((l) => (
          <Link key={l.to} to={l.to}>
            {l.label}
          </Link>
        ))}
      </div>
    );
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