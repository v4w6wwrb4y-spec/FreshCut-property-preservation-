import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isManager = user?.role === "manager";
  const basePath = isManager ? "/manager" : "/employee";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-inner">
          <Link to={basePath} className="logo">
            <span className="logo-icon">🌿</span> Fresh Cut
          </Link>
          <nav className="header-nav">
            {isManager ? (
              <Link to="/manager" className={location.pathname === "/manager" ? "active" : ""}>
                Dashboard
              </Link>
            ) : (
              <Link to="/employee" className={location.pathname === "/employee" ? "active" : ""}>
                My Jobs
              </Link>
            )}
          </nav>
          <div className="header-user">
            <div className="user-badge">
              <div className="user-avatar">{user?.name?.charAt(0)}</div>
              <div className="user-meta">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
