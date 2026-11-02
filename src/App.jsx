import { Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, PiggyBank, Target, Tags, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Savings from './pages/Savings';
import Budgets from './pages/Budgets';
import Categories from './pages/Categories';

const nav = [
  { to: '/', label: 'Beranda', fullLabel: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transaksi', fullLabel: 'Transaksi', icon: ArrowLeftRight },
  { to: '/savings', label: 'Tabungan', fullLabel: 'Tabungan', icon: PiggyBank },
  { to: '/budgets', label: 'Budget', fullLabel: 'Budget', icon: Target },
  { to: '/categories', label: 'Kategori', fullLabel: 'Kategori', icon: Tags },
];

function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const current = nav.find(item => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to));
  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span>Ruang<span className="brand-accent">Dana</span><small>PERSONAL FINANCE</small></span>
        </div>
        <div className="sidebar-caption">MENU UTAMA</div>
        <nav className="side-nav">
          {nav.map(item => {
            const Icon = item.icon;
            return <NavLink key={item.to} to={item.to} end={item.end} className={({isActive}) => isActive ? 'active' : ''}>
              <Icon size={19} strokeWidth={2.1} /><span>{item.fullLabel}</span><span className="nav-indicator" />
            </NavLink>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-chip">
            <div className="profile-avatar">{(user?.nama || 'U').trim().charAt(0).toUpperCase()}</div>
            <div className="profile-meta"><strong>{user?.nama || 'Pengguna'}</strong><span>{user?.email}</span></div>
          </div>
          <button className="logout-button" onClick={handleLogout}><LogOut size={17} /> Keluar akun</button>
        </div>
      </aside>
      <main className="main-content">
        <header className="mobile-topbar">
          <div className="brand compact"><span className="brand-mark"><Sparkles size={17} /></span><span>Ruang<span className="brand-accent">Dana</span></span></div>
          <div className="mobile-user">{(user?.nama || 'U').trim().charAt(0).toUpperCase()}</div>
        </header>
        <div className="content-inner">
          <div className="mobile-page-context"><span>{current?.fullLabel || 'Ruang Dana'}</span><button onClick={handleLogout} aria-label="Keluar"><LogOut size={17}/></button></div>
          {children}
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Navigasi utama">
        {nav.map(item => {
          const Icon = item.icon;
          return <NavLink key={item.to} to={item.to} end={item.end} className={({isActive}) => isActive ? 'active' : ''}>
            <Icon size={20} strokeWidth={2.1}/><span>{item.label}</span>
          </NavLink>;
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/*" element={<ProtectedRoute><AppLayout><Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/transactions" element={<Transactions />} />
      <Route path="/savings" element={<Savings />} />
      <Route path="/budgets" element={<Budgets />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></AppLayout></ProtectedRoute>} />
  </Routes>;
}
