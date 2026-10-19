import { Fragment, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BRAND } from "../../branding";
import Icon from "./Icon";
import { InLayoutContext } from "./layoutContext";
import { NAV_SECTIONS } from "./Navigation";
import type { NavItem, NavSubItem } from "./Navigation";

function pathMatches(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + "/");
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const fullName = localStorage.getItem("fullName") || "";
  const role = localStorage.getItem("role") || "";

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((item) => item.roles.includes(role)),
  })).filter((s) => s.items.length > 0);

  function isActive(item: NavItem): boolean {
    const base = item.prefix ?? item.to;
    return base ? pathMatches(location.pathname, base) : false;
  }

  function isSubActive(sub: NavSubItem): boolean {
    return (sub.prefixes ?? [sub.to]).some((p) => pathMatches(location.pathname, p));
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("fullName");
    localStorage.removeItem("mustChangePassword");
    navigate("/login");
  }

  return (
    <InLayoutContext.Provider value={true}>
      <div className="shell">
        <aside className={open ? "sidebar open" : "sidebar"} aria-label="Main navigation">
          <div className="sidebar-brand">
            {BRAND.logo && <img src={BRAND.logo} alt={`${BRAND.shortName} logo`} />}
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-name">{BRAND.shortName}</div>
              <div className="sidebar-brand-sub">{BRAND.systemName}</div>
            </div>
          </div>

          <nav>
            {sections.map((section) => (
              <div key={section.title} className="nav-section">
                <div className="nav-title">{section.title}</div>
                {section.items.map((item) =>
                  item.soon || !item.to ? (
                    <span key={item.label} className="nav-item disabled" aria-disabled="true">
                      <Icon name={item.icon} />
                      {item.label}
                      <span className="nav-soon">Soon</span>
                    </span>
                  ) : (
                    <Fragment key={item.label}>
                      <Link
                        to={item.to}
                        className={isActive(item) ? "nav-item active" : "nav-item"}
                        aria-current={isActive(item) ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <Icon name={item.icon} />
                        {item.label}
                      </Link>
                      {item.children && isActive(item) && (
                        <div className="nav-sub">
                          {item.children.map((sub) => (
                            <Link
                              key={sub.label}
                              to={sub.to}
                              className={isSubActive(sub) ? "nav-subitem active" : "nav-subitem"}
                              onClick={() => setOpen(false)}
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </Fragment>
                  )
                )}
              </div>
            ))}
          </nav>
        </aside>

        {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}

        <div className="shell-main">
          <header className="topbar-shell">
            <button
              className="icon-button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <div className="topbar-spacer" />
            <div className="topbar-user">
              <span className="topbar-name">{fullName}</span>
              <span className="user-role-chip">{role}</span>
              <button className="small-button secondary" onClick={logout}>
                Log out
              </button>
            </div>
          </header>

          <main className="shell-content">
            <Outlet />
          </main>
        </div>
      </div>
    </InLayoutContext.Provider>
  );
}