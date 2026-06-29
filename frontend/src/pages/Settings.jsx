import React, { useState } from 'react';
import { Sliders, Key, HelpCircle, Save, Check } from 'lucide-react';

const Settings = () => {
  const [threshold, setThreshold] = useState(0.5);
  const [model, setModel] = useState('v1.0.1');
  const [recommendations, setRecommendations] = useState(true);
  const [apiLogging, setApiLogging] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '800px' }}>
      
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Model Settings */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} style={{ color: 'rgb(var(--color-primary-light))' }} />
            Pipeline & Model Configurations
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Active Model Version</label>
              <select 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-color)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  color: '#fff',
                  outline: 'none'
                }}
              >
                <option value="v1.0.1" style={{ backgroundColor: '#101422' }}>Logistic Regression (v1.0.1) - [Active]</option>
                <option value="v1.0.0" style={{ backgroundColor: '#101422' }}>Logistic Regression (v1.0.0) - [Archived]</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <label>Classification Threshold</label>
                <span style={{ color: 'rgb(var(--color-primary-light))', fontWeight: 700 }}>{threshold}</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="0.9" 
                step="0.05"
                value={threshold} 
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                style={{ 
                  accentColor: 'rgb(var(--color-primary))',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '6px'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Lower thresholds maximize churn recall (catching more potential churners) but increase false positives.
              </span>
            </div>
          </div>
        </div>

        {/* Inference preferences */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={20} style={{ color: '#06b6d4' }} />
            Inference & Retention Settings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '13.5px', color: 'var(--text-primary)' }}>
              <input 
                type="checkbox" 
                checked={recommendations}
                onChange={(e) => setRecommendations(e.target.checked)}
                style={{ accentColor: 'rgb(var(--color-primary))', width: '16px', height: '16px' }}
              />
              Enable prescriptive retention recommendations
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '13.5px', color: 'var(--text-primary)' }}>
              <input 
                type="checkbox" 
                checked={apiLogging}
                onChange={(e) => setApiLogging(e.target.checked)}
                style={{ accentColor: 'rgb(var(--color-primary))', width: '16px', height: '16px' }}
              />
              Audit log-record all prediction HTTP requests
            </label>
          </div>
        </div>

        {/* API Credentials */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} style={{ color: '#f59e0b' }} />
            API Token Credentials
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>RetainAI Integration Secret Key</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="password" 
                readOnly
                value="••••••••••••••••••••••••••••••••••••••••"
                style={{ 
                  flexGrow: 1, 
                  background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid var(--border-color)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}
              />
              <button 
                type="button"
                onClick={() => alert("Token copied to clipboard!")}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '0 16px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
          >
            {saved ? <Check size={18} /> : <Save size={18} />}
            {saved ? 'Configurations Saved!' : 'Save System Settings'}
          </button>
          {saved && <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>System variables loaded successfully.</span>}
        </div>

      </form>
    </div>
  );
};

export default Settings;
