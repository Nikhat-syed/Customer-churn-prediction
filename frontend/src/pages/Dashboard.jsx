import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import MetricTile from '../components/MetricTile';
import { 
  Users, 
  TrendingUp, 
  Percent, 
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const Dashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to load dashboard metrics');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
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

  // Pre-configured constants for Pie charts
  const COLORS = ['#6366f1', '#06b6d4', '#ec4899', '#f59e0b'];

  const barData = stats ? [
    { name: 'Retained Customers', charges: stats.avg_charges_comparison.retained },
    { name: 'Churned Customers', charges: stats.avg_charges_comparison.churner }
  ] : [];

  return (
    <div className="animate-fade-in">
      {/* Metric Cards Row */}
      <div className="grid-dashboard">
        <MetricTile 
          title="Total Customers Analyzed" 
          value={stats?.total_predictions || 0} 
          icon={Users} 
          colorClass="primary" 
        />
        <MetricTile 
          title="Overall Churn Rate" 
          value={`${stats?.churn_rate || 0}%`} 
          icon={Percent} 
          colorClass="danger"
          trend={{ value: 2.4, isPositive: false }}
        />
        <MetricTile 
          title="Average Churn Risk" 
          value={`${stats?.avg_probability || 0}%`} 
          icon={TrendingUp} 
          colorClass="warning"
        />
        <MetricTile 
          title="High Risk Alerts" 
          value={stats?.segments.High || 0} 
          icon={AlertTriangle} 
          colorClass="danger"
        />
      </div>

      {/* Visual Analytics Rows */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        {/* Contract Mix Pie Chart */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Contract Ingestion Split
          </h2>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={stats?.contract_distribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats?.contract_distribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#101422', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avg Monthly Charges Bar Chart */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>
            Average Monthly Charges Comparison
          </h2>
          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#101422', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="charges" fill="#06b6d4" radius={[8, 8, 0, 0]}>
                  <Cell fill="#6366f1" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Critical High-Risk Alert List */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} style={{ color: 'rgb(var(--color-danger))' }} />
          Action Alerts Center: High Risk Customers
        </h2>
        
        {stats?.high_risk_alerts.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No high risk customer alerts currently flagged.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Contract Type</th>
                  <th>Tenure</th>
                  <th>Monthly Bill</th>
                  <th>Churn Probability</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.high_risk_alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td style={{ fontWeight: 700 }}>{alert.customer_id}</td>
                    <td>{alert.contract}</td>
                    <td>{alert.tenure} months</td>
                    <td>${alert.monthly_charges}</td>
                    <td style={{ fontWeight: 700, color: 'rgb(var(--color-danger))' }}>
                      {alert.probability}%
                    </td>
                    <td>
                      <span className="badge badge-danger">Immediate Action</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
