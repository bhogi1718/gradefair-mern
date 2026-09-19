import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Avatar, Dropdown, Icon } from "../ui";
import { ROLE_LABEL } from "../../utils/constants";
import useApi from "../../hooks/useApi";

const NAV = {
  admin: [
    { section: "Overview" },
    { to: "/admin", label: "Admin panel", icon: "shield" },
    { to: "/projects", label: "All projects", icon: "folder" },
    { to: "/leaderboard", label: "Leaderboard", icon: "trophy" },
    { to: "/activity", label: "Activity", icon: "activity" }
  ],
  manager: [
    { section: "Workspace" },
    { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/projects", label: "Projects", icon: "folder" },
    { to: "/tasks", label: "Tasks", icon: "tasks" },
    { section: "Insights" },
    { to: "/leaderboard", label: "Leaderboard", icon: "trophy" },
    { to: "/activity", label: "Activity", icon: "activity" }
  ],
  member: [
    { section: "Workspace" },
    { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/projects", label: "My projects", icon: "folder" },
    { to: "/tasks", label: "My tasks", icon: "tasks", badgeKey: "openTasks" },
    { section: "Team" },
    { to: "/feedback", label: "Peer feedback", icon: "star" },
    { to: "/leaderboard", label: "Leaderboard", icon: "trophy" },
    { to: "/activity", label: "Activity", icon: "activity" }
  ]
};

const TITLES = [
  ["/dashboard", "Dashboard"],
  ["/projects/", "Project"],
  ["/projects", "Projects"],
  ["/tasks", "Tasks"],
  ["/leaderboard", "Leaderboard"],
  ["/feedback", "Peer feedback"],
  ["/activity", "Activity"],
  ["/profile", "Profile"],
  ["/admin", "Admin panel"]
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const nav = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar") === "collapsed");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Small badge count for members: open tasks
  const { data: myTasks, reload: reloadTasks } = useApi(user?.role === "member" ? "/tasks" : null, { initial: [] });
  const openTasks = (myTasks || []).filter((t) => t.status !== "done").length;
  const overdue = (myTasks || []).filter((t) => t.status !== "done" && t.deadline && new Date(t.deadline) < new Date()).length;

  useEffect(() => {
    localStorage.setItem("sidebar", collapsed ? "collapsed" : "open");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    reloadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Task rows dispatch this after a status change so the badge stays accurate
  useEffect(() => {
    const onChange = () => reloadTasks();
    window.addEventListener("gradefair:tasks-changed", onChange);
    return () => window.removeEventListener("gradefair:tasks-changed", onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = TITLES.find(([p]) => location.pathname.startsWith(p))?.[1] || "GradeFair";
  const items = NAV[user?.role] || NAV.member;

  return (
    <div className="shell">
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Icon name="scale" size={18} />
          </div>
          <span>GradeFair</span>
        </div>

        <nav className="sidebar-nav">
          {items.map((item, i) =>
            item.section ? (
              <div key={i} className="nav-section">
                {item.section}
              </div>
            ) : (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} title={collapsed ? item.label : undefined}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.badgeKey === "openTasks" && openTasks > 0 && <span className="nav-badge" style={overdue ? undefined : { background: "var(--primary)" }}>{openTasks}</span>}
              </NavLink>
            )
          )}

          <div style={{ flex: 1 }} />

          <button className="nav-item hide-mobile" onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <Icon name={collapsed ? "chevronsRight" : "chevronsLeft"} />
            <span>Collapse</span>
          </button>
        </nav>

        <div className="sidebar-user" role="button" onClick={() => nav("/profile")} style={{ cursor: "pointer" }} title="Profile">
          <Avatar name={user?.name} hue={user?.avatarColor} size={36} />
          <div className="sidebar-user-text">
            <strong>{user?.name}</strong>
            <small>{ROLE_LABEL[user?.role] || user?.role}</small>
          </div>
        </div>
      </aside>

      <div className={`content ${collapsed ? "collapsed" : ""}`}>
        <header className="topbar">
          <button className="btn-icon only-mobile" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>

          <div className="topbar-title">
            {title}
            <small>{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</small>
          </div>

          <div className="topbar-actions">
            {user?.role === "member" && overdue > 0 && (
              <button className="btn btn-sm btn-danger-soft" onClick={() => nav("/tasks")} title="Overdue tasks">
                <Icon name="alert" />
                <span className="hide-mobile">{overdue} overdue</span>
              </button>
            )}

            <button className="btn-icon bordered" onClick={toggle} title={isDark ? "Switch to light mode" : "Switch to dark mode"} aria-label="Toggle theme">
              <Icon name={isDark ? "sun" : "moon"} />
            </button>

            <Dropdown
              trigger={
                <button className="btn-icon" style={{ padding: 3 }} aria-label="Account menu">
                  <Avatar name={user?.name} hue={user?.avatarColor} size={34} />
                </button>
              }
            >
              <div className="menu-head">
                <strong style={{ color: "var(--text)" }}>{user?.name}</strong>
                <br />
                {user?.email}
              </div>
              <hr />
              <button onClick={() => nav("/profile")}>
                <Icon name="user" /> My profile
              </button>
              <button onClick={toggle}>
                <Icon name={isDark ? "sun" : "moon"} /> {isDark ? "Light mode" : "Dark mode"}
              </button>
              <hr />
              <button className="danger" onClick={() => { logout(); nav("/login", { replace: true }); }}>
                <Icon name="logout" /> Sign out
              </button>
            </Dropdown>
          </div>
        </header>

        <main className="page" key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
