import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const initials = user?.username?.substring(0, 2).toUpperCase() || 'AF';

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">⚡</div>
          <div>
            <h1>AgentFlow</h1>
            <span>AI Orchestration</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>
            <span className="nav-icon">📊</span> Dashboard
          </NavLink>
          <NavLink to="/executions" className={({isActive}) => isActive ? 'active' : ''}>
            <span className="nav-icon">▶️</span> Executions
          </NavLink>
          <NavLink to="/templates" className={({isActive}) => isActive ? 'active' : ''}>
            <span className="nav-icon">🧩</span> Templates
          </NavLink>
          <NavLink to="/analytics" className={({isActive}) => isActive ? 'active' : ''}>
            <span className="nav-icon">📈</span> Analytics
          </NavLink>
        </nav>

        <div className="sidebar-user">
          <div className="user-info">
            <div className="avatar">{initials}</div>
            <div>
              <div className="user-name">{user?.username}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button className="btn btn-icon btn-secondary" onClick={logout} title="Logout">🚪</button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
