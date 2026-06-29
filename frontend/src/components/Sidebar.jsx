import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UserCheck, 
  History, 
  LogOut,
  Sliders,
  Cpu,
  BarChart2,
  Activity,
  Info,
  Settings as SettingsIcon
} from 'lucide-react';

const Sidebar = ({ activePage, setActivePage }) => {
  const { user, logout } = useAuth();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'predictions', label: 'Customer Predict', icon: UserCheck },
    { id: 'batch', label: 'Batch Predict', icon: Sliders },
    { id: 'analytics', label: 'Analytics Hub', icon: BarChart2 },
    { id: 'performance', label: 'Model Performance', icon: Activity },
    { id: 'about', label: 'About Model', icon: Info },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <Cpu size={28} className="logo-icon" style={{ color: 'rgb(var(--color-primary-light))' }} />
        <span>RetainAI</span>
      </div>
      
      <nav className="nav-links">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <Icon size={20} />
              {item.label}
            </div>
          );
        })}
      </nav>
      
      {user && (
        <div className="sidebar-user">
          <div className="user-avatar">
            {user.email.substring(0, 2).toUpperCase()}
          </div>
          <div className="user-info" style={{ flexGrow: 1 }}>
            <span className="user-name">{user.email.split('@')[0]}</span>
            <span className="user-role">{user.role}</span>
          </div>
          <button 
            onClick={logout} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
