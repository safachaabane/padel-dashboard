import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, LogOut, ShieldCheck, ClipboardList, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = admin?.role === 'super_admin';

  const handleLogout = () => {
    logout();
    toast.success('Déconnecté');
    navigate('/admin/login');
  };

  const libelleInscriptions =
    admin?.role === 'admin_clients' ? 'Clients inscrits'
    : admin?.role === 'admin_personnel' ? 'Personnel inscrit'
    : 'Inscriptions';

  return (
    <div className="page-wrapper">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-brand">
          🎾 <span>Padel<span className="accent">Club</span></span>
        </div>
        <nav className="topbar-nav">
          <span style={{ color: 'var(--green-400)', fontSize: '.85rem' }}>
            👤 {admin?.nom}
          </span>
          <button onClick={handleLogout}>
            <LogOut size={14} style={{ marginRight: 4 }} />
            Déconnexion
          </button>
        </nav>
      </header>

      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <span className="sidebar-section-label">Navigation</span>

          {isSuperAdmin && (
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <LayoutDashboard size={16} /> Tableau de bord
            </NavLink>
          )}

          {isSuperAdmin && (
            <NavLink
              to="/admin/creneaux"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <CalendarDays size={16} /> Créneaux
            </NavLink>
          )}

          <NavLink
            to="/admin/inscriptions"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Users size={16} /> {libelleInscriptions}
          </NavLink>

          <NavLink
            to="/admin/details"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <ClipboardList size={16} /> Détails &amp; Export
          </NavLink>

          {isSuperAdmin && (
            <NavLink
              to="/admin/administrateurs"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <ShieldCheck size={16} /> Administrateurs
            </NavLink>
          )}

          {isSuperAdmin && (
            <NavLink
              to="/admin/parametres"
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Settings size={16} /> Paramètres
            </NavLink>
          )}

          <span className="sidebar-section-label" style={{ marginTop: 'auto' }}>Liens publics</span>
          <a href="/inscription/client"    target="_blank" className="sidebar-link">🧑 Formulaire Client</a>
          <a href="/inscription/personnel" target="_blank" className="sidebar-link">👷 Formulaire Personnel</a>
        </aside>

        {/* Main */}
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
