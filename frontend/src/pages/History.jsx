import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, AlertTriangle, CheckCircle2, ChevronRight, X, Download, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const History = () => {
  const { token } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterChurn, setFilterChurn] = useState("all"); // all, churn, active
  const [page, setPage] = useState(1);
  const [selectedPred, setSelectedPred] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/predict/history?page=${page}&limit=50`;
      if (search) url += `&search=${search}`;
      if (filterChurn === 'churn') url += `&is_churn=true`;
      if (filterChurn === 'active') url += `&is_churn=false`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPredictions(data);
      }
    } catch (err) {
      console.error("Failed to fetch logs history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, filterChurn]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevent row select drawer click
    if (!window.confirm("Are you sure you want to permanently delete this prediction record?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/predict/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setPredictions(prev => prev.filter(p => p.id !== id));
        if (selectedPred && selectedPred.id === id) {
          setSelectedPred(null);
        }
        alert("Prediction log entry deleted successfully.");
      } else {
        const errData = await res.json();
        alert(`Failed to delete: ${errData.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Failed to execute delete request:", err);
      alert("An error occurred during deletion.");
    }
  };

  const getGaugeColor = (prob) => {
    if (prob < 0.4) return 'rgb(var(--color-success))';
    if (prob < 0.7) return 'rgb(var(--color-warning))';
    return 'rgb(var(--color-danger))';
  };

  const handleDownloadCSV = () => {
    if (predictions.length === 0) return;
    const headers = ["CustomerID", "Contract", "MonthlyCharges", "tenure", "ChurnProbability", "IsChurn", "ConfidenceScore"];
    const rows = predictions.map(pred => {
      const confidence = Math.round((Math.abs(pred.churn_probability - 0.5) / 0.5) * 100);
      return [
        pred.customer_id,
        pred.features.Contract,
        pred.features.MonthlyCharges,
        pred.features.tenure,
        `${Math.round(pred.churn_probability * 100)}%`,
        pred.is_churn ? "Yes" : "No",
        `${confidence}%`
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RetainAI_Churn_Predictions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in">
      {/* Search & Filter Header */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', gap: '8px', flexGrow: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by Customer ID..."
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <select
              className="input-field"
              value={filterChurn}
              onChange={(e) => setFilterChurn(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="all">All Predictions</option>
              <option value="churn">Flagged Churn</option>
              <option value="active">Flagged Retained</option>
            </select>
          </div>

          <button type="submit" className="btn-primary">
            Apply Filters
          </button>

          <button 
            type="button" 
            className="btn" 
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border-color)', 
              color: '#fff',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onClick={handleDownloadCSV}
          >
            <Download size={16} />
            Export CSV
          </button>
        </form>
      </div>

      {/* History logs table */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div style={{ 
              border: '4px solid rgba(255,255,255,0.05)', borderTopColor: 'rgb(var(--color-primary))',
              borderRadius: '50%', width: '32px', height: '32px', animation: 'rotateLoader 1s linear infinite'
            }} />
          </div>
        ) : predictions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No prediction logs matching current filters found.
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer ID</th>
                    <th>Contract</th>
                    <th>Monthly Bill</th>
                    <th>Tenure</th>
                    <th>Risk Score</th>
                    <th>Confidence</th>
                    <th>Status</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((pred) => (
                    <tr 
                      key={pred.id} 
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedPred(pred)}
                    >
                      <td style={{ fontWeight: 700 }}>{pred.customer_id}</td>
                      <td>{pred.features.Contract}</td>
                      <td>${pred.features.MonthlyCharges}</td>
                      <td>{pred.features.tenure} months</td>
                      <td style={{ fontWeight: 700, color: getGaugeColor(pred.churn_probability) }}>
                        {Math.round(pred.churn_probability * 100)}%
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {Math.round((Math.abs(pred.churn_probability - 0.5) / 0.5) * 100)}%
                      </td>
                      <td>
                        {pred.is_churn ? (
                          <span className="badge badge-danger">At Risk</span>
                        ) : (
                          <span className="badge badge-success">Stable</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => handleDelete(pred.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'color 0.2s ease',
                              outline: 'none'
                            }}
                            title="Delete log record"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button 
                            onClick={() => setSelectedPred(pred)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
              <button 
                type="button"
                className="btn" 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-color)', 
                  opacity: page === 1 ? 0.4 : 1,
                  cursor: page === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Page {page}</span>
              <button 
                type="button"
                className="btn" 
                disabled={predictions.length < 50} 
                onClick={() => setPage(p => p + 1)}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid var(--border-color)', 
                  opacity: predictions.length < 50 ? 0.4 : 1,
                  cursor: predictions.length < 50 ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {/* Detail Overlay Drawer */}
      {selectedPred && (
        <div style={{
          position: 'fixed', top: 0, right: 0, width: '480px', height: '100vh',
          backgroundColor: '#0d101d', borderLeft: '1px solid var(--border-color)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)', zIndex: 1000, padding: '40px',
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px'
        }} className="animate-fade-in">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '20px' }}>Customer Profile Details</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>ID: {selectedPred.customer_id}</span>
            </div>
            <button 
              onClick={() => setSelectedPred(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Risk Section */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Churn Probability</div>
              <div style={{ 
                fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800,
                color: getGaugeColor(selectedPred.churn_probability)
              }}>
                {Math.round(selectedPred.churn_probability * 100)}%
              </div>
            </div>
            {selectedPred.is_churn ? (
              <span className="badge badge-danger">High Risk</span>
            ) : (
              <span className="badge badge-success">Retained</span>
            )}
          </div>

          {/* Model Confidence */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Model Confidence Score</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
                {Math.round((Math.abs(selectedPred.churn_probability - 0.5) / 0.5) * 100)}%
              </div>
            </div>
            <span className="badge badge-success">Verified</span>
          </div>

          {/* Feature Specs */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Service Configuration
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Contract:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedPred.features.Contract}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Internet:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedPred.features.InternetService}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Tenure:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedPred.features.tenure} months</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Monthly Bill:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>${selectedPred.features.MonthlyCharges}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Payment Method:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedPred.features.PaymentMethod}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Tech Support:</span>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{selectedPred.features.TechSupport}</div>
              </div>
            </div>
          </div>

          {/* Action Actions */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Actions Workspace
            </h3>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => window.print()}
                className="btn"
                style={{
                  flexGrow: 1,
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  color: '#818cf8',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Print PDF Report
              </button>
              
              <button 
                onClick={(e) => handleDelete(selectedPred.id, e)}
                className="btn"
                style={{
                  flexGrow: 1,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'rgb(var(--color-danger))',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={16} />
                Delete Record
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Email Report to Success Team</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input 
                  type="email" 
                  placeholder="csm@company.com"
                  id="email-report-input"
                  style={{
                    flexGrow: 1,
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
                <button 
                  onClick={async () => {
                    const emailVal = document.getElementById("email-report-input").value;
                    if (!emailVal) {
                      alert("Please enter an email address.");
                      return;
                    }
                    try {
                      const res = await fetch(`${API_BASE}/predict/email-report`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          customer_id: selectedPred.customer_id,
                          email: emailVal
                        })
                      });
                      if (res.ok) {
                        const data = await res.json();
                        alert(data.message);
                      }
                    } catch (err) {
                      console.error("Email report request failed:", err);
                    }
                  }}
                  style={{
                    background: 'rgb(var(--color-primary))',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* SHAP Explanation */}
          {selectedPred.explanation && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Risk Drivers Impact
              </h3>
              
              <div className="shap-bar-container">
                {selectedPred.explanation.map((exp, idx) => {
                  const maxVal = Math.max(...selectedPred.explanation.map(e => Math.abs(e.impact)), 0.05);
                  const pct = (Math.abs(exp.impact) / maxVal) * 100;
                  const isRisk = exp.impact > 0;
                  
                  return (
                    <div key={idx} className="shap-row">
                      <div className="shap-label" style={{ width: '130px' }}>{exp.feature}</div>
                      <div className="shap-bar-outer">
                        <div 
                          className="shap-bar-inner" 
                          style={{ 
                            width: `${pct}%`,
                            backgroundColor: isRisk ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)'
                          }}
                        />
                      </div>
                      <div className="shap-val" style={{ color: isRisk ? 'rgb(var(--color-danger))' : 'rgb(var(--color-success))' }}>
                        {isRisk ? '+' : ''}{Math.round(exp.impact * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default History;
