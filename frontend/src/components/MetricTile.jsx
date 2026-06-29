import React from 'react';

const MetricTile = ({ title, value, icon: Icon, trend, colorClass }) => {
  // Define styling dynamically based on status classes
  const colorMap = {
    primary: { bg: 'rgba(99, 102, 241, 0.1)', text: 'rgb(var(--color-primary-light))' },
    secondary: { bg: 'rgba(6, 182, 212, 0.1)', text: 'rgb(var(--color-secondary-light))' },
    danger: { bg: 'rgba(239, 68, 68, 0.1)', text: 'rgb(var(--color-danger))' },
    success: { bg: 'rgba(16, 185, 129, 0.1)', text: 'rgb(var(--color-success))' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', text: 'rgb(var(--color-warning))' }
  };

  const currentStyles = colorMap[colorClass] || colorMap.primary;

  return (
    <div className="glass-panel metric-card animate-fade-in">
      <div className="metric-details">
        <h3>{title}</h3>
        <div className="metric-value">{value}</div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px' }}>
            <span style={{ 
              color: trend.isPositive ? 'rgb(var(--color-success))' : 'rgb(var(--color-danger))',
              fontWeight: 700 
            }}>
              {trend.isPositive ? '↑' : '↓'} {trend.value}%
            </span>
            <span style={{ color: 'var(--text-muted)' }}>vs last week</span>
          </div>
        )}
      </div>
      
      <div 
        className="metric-icon-box"
        style={{ 
          backgroundColor: currentStyles.bg,
          color: currentStyles.text
        }}
      >
        <Icon size={24} />
      </div>
    </div>
  );
};

export default MetricTile;
