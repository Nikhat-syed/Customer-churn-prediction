import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Predictions from './pages/Predictions';
import History from './pages/History';
import Login from './pages/Login';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ModelPerformance from './pages/ModelPerformance';
import AboutModel from './pages/AboutModel';
import Settings from './pages/Settings';

function App() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#090b11' 
      }}>
        <div style={{ 
          border: '4px solid rgba(255,255,255,0.05)', 
          borderTopColor: 'rgb(var(--color-primary))',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'rotateLoader 1s linear infinite'
        }} />
      </div>
    );
  }

  // Secure Route check
  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'predictions':
        return <Predictions defaultTab="single" />;
      case 'batch':
        return <Predictions defaultTab="batch" />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'performance':
        return <ModelPerformance />;
      case 'about':
        return <AboutModel />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return { title: 'Churn Analytics Dashboard', desc: 'Real-time overview of user metrics and churn alerts' };
      case 'predictions':
        return { title: 'Single Customer Inferences', desc: 'Predict risk probabilities and run what-if simulations' };
      case 'batch':
        return { title: 'Batch CSV Processing Engine', desc: 'Upload customer spreadsheets to query bulk predictions' };
      case 'analytics':
        return { title: 'Analytics Insights Hub', desc: 'Deeper subscriber cohort performance and risk timelines' };
      case 'performance':
        return { title: 'Model Evaluation Center', desc: 'Confusion matrices, ROC curves, and parameters for the active version' };
      case 'about':
        return { title: 'About the Machine Learning Model', desc: 'Pipeline steps, calculations, and their necessity' };
      case 'settings':
        return { title: 'System Settings', desc: 'Manage classification thresholds, models, and integration tokens' };
      default:
        return { title: 'Churn Analytics Dashboard', desc: 'Real-time overview of user metrics and churn alerts' };
    }
  };

  const pageInfo = getPageTitle();

  return (
    <div className="app-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      
      <main className="main-content">
        <header className="header-container">
          <div className="header-title">
            <h1 className="animate-fade-in">{pageInfo.title}</h1>
            <p className="animate-fade-in" style={{ animationDelay: '0.1s' }}>{pageInfo.desc}</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={toggleTheme}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
                outline: 'none'
              }}
              title="Toggle Theme Mode"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>System Mode:</span>
              <span className="badge badge-success" style={{ letterSpacing: '0.05em' }}>Production API Ready</span>
            </div>
          </div>
        </header>
        
        <div className="page-body">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;
