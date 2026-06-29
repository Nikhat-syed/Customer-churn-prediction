import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, RefreshCw, Search, Filter } from 'lucide-react';
import { downloadCSVReport, downloadExcelReport, downloadPDFReport } from '../utils/reportExporter';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const Predictions = ({ defaultTab = 'single' }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Batch upload state variables
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successJob, setSuccessJob] = useState(null);
  const [batchPredictions, setBatchPredictions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  
  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/predict/jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (err) {
      console.error("Failed to load prediction jobs:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'batch') {
      fetchJobs();
    }
  }, [activeTab]);

  // Fetch individual predictions for the completed batch job
  const fetchBatchPredictions = async (jobId) => {
    try {
      const res = await fetch(`${API_BASE}/predict/history?limit=1000&job_id=${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBatchPredictions(data);
      }
    } catch (err) {
      console.error("Failed to load predictions for job:", err);
    }
  };

  useEffect(() => {
    if (successJob) {
      fetchBatchPredictions(successJob.id);
    } else {
      setBatchPredictions([]);
    }
  }, [successJob]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
    } else {
      setError("Please drop a valid CSV file.");
    }
  };

  const handleFileSelect = (e) => {
    setError(null);
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
    } else {
      setError("Please select a valid CSV file.");
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setSuccessJob(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/predict/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to process batch CSV.");
      }

      const data = await res.json();
      setSuccessJob(data);
      setFile(null);
      fetchJobs(); // Reload jobs list
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPredictions = () => {
    if (!batchPredictions || batchPredictions.length === 0) return;
    
    // Construct CSV content
    const headers = [
      "CustomerID", "Gender", "Contract", "InternetService", "TechSupport", 
      "MonthlyCharges", "TotalCharges", "Tenure", "ChurnProbability", 
      "RiskLevel", "IsChurn"
    ];
    
    const rows = batchPredictions.map(p => {
      const f = p.features || {};
      return [
        p.customer_id,
        f.gender || '',
        f.Contract || '',
        f.InternetService || '',
        f.TechSupport || '',
        f.MonthlyCharges || '',
        f.TotalCharges || '',
        f.tenure || '',
        p.churn_probability,
        p.churn_probability >= 0.7 ? 'High' : p.churn_probability >= 0.4 ? 'Medium' : 'Low',
        p.is_churn ? 'Yes' : 'No'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `predictions_${successJob?.filename || 'batch'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setSuccessJob(null);
    setBatchPredictions([]);
    setFile(null);
    setError(null);
  };

  // Process risk levels for charts
  const getRiskLevelsData = () => {
    let low = 0, med = 0, high = 0;
    batchPredictions.forEach(p => {
      if (p.churn_probability >= 0.7) high++;
      else if (p.churn_probability >= 0.4) med++;
      else low++;
    });
    return [
      { name: 'Low Risk', value: low, color: '#10b981' },
      { name: 'Medium Risk', value: med, color: '#f59e0b' },
      { name: 'High Risk', value: high, color: '#ef4444' }
    ];
  };

  const getContractChargesData = () => {
    // Group monthly charges by contract
    const contracts = { 'Month-to-month': { sum: 0, count: 0 }, 'One year': { sum: 0, count: 0 }, 'Two year': { sum: 0, count: 0 } };
    batchPredictions.forEach(p => {
      const f = p.features || {};
      const c = f.Contract;
      const ch = Number(f.MonthlyCharges || 0);
      if (contracts[c] !== undefined) {
        contracts[c].sum += ch;
        contracts[c].count++;
      }
    });
    return Object.entries(contracts).map(([name, val]) => ({
      name,
      'Avg Monthly Charges': val.count > 0 ? roundToTwo(val.sum / val.count) : 0
    }));
  };

  const roundToTwo = (num) => Math.round(num * 100) / 100;

  // Filter predictions list
  const filteredPredictions = batchPredictions.filter(p => {
    const matchesSearch = p.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
    const level = p.churn_probability >= 0.7 ? 'High' : p.churn_probability >= 0.4 ? 'Medium' : 'Low';
    const matchesRisk = riskFilter === 'All' || level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="animate-fade-in">
      {/* Navigation tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '30px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('single')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'single' ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
            color: activeTab === 'single' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          Single Customer Playground
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'batch' ? '2px solid rgb(var(--color-primary))' : '2px solid transparent',
            color: activeTab === 'batch' ? '#fff' : 'var(--text-secondary)',
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          CSV Batch Processor
        </button>
      </div>

      {activeTab === 'single' ? (
        <WhatIfSimulator />
      ) : successJob ? (
        /* Dynamic Post-Upload Workspace */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
          
          {/* Header Panel */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '4px' }}>
                Batch Workspace: {successJob.filename}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Audited Inference run completed successfully. Persisted results.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={handleReset} style={{ gap: '8px' }}>
                <RefreshCw size={16} />
                Upload New CSV
              </button>
              <button className="btn-secondary" onClick={() => downloadCSVReport(successJob.filename, batchPredictions, { total: successJob.total_records, churned: successJob.churned_records, avgProbability: batchPredictions.reduce((sum, p) => sum + p.churn_probability, 0) / (batchPredictions.length || 1) })} style={{ gap: '8px' }}>
                <Download size={16} />
                Export CSV
              </button>
              <button className="btn-secondary" onClick={() => downloadExcelReport(successJob.filename, batchPredictions, { total: successJob.total_records, churned: successJob.churned_records, avgProbability: batchPredictions.reduce((sum, p) => sum + p.churn_probability, 0) / (batchPredictions.length || 1) })} style={{ gap: '8px' }}>
                <FileText size={16} />
                Export Excel
              </button>
              <button className="btn-primary" onClick={() => downloadPDFReport(successJob.filename, batchPredictions, { total: successJob.total_records, churned: successJob.churned_records, avgProbability: batchPredictions.reduce((sum, p) => sum + p.churn_probability, 0) / (batchPredictions.length || 1) })} style={{ gap: '8px' }}>
                <FileText size={16} />
                Print PDF
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Total Ingested</div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>{successJob.total_records}</div>
            </div>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>High Risk Flagged</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'rgb(var(--color-danger))' }}>{successJob.churned_records}</div>
            </div>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Estimated Churn Rate</div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>
                {successJob.total_records > 0 ? roundToTwo((successJob.churned_records / successJob.total_records) * 100) : 0}%
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Average Batch Risk</div>
              <div style={{ fontSize: '28px', fontWeight: 800 }}>
                {batchPredictions.length > 0 ? roundToTwo((batchPredictions.reduce((sum, p) => sum + p.churn_probability, 0) / batchPredictions.length) * 100) : 0}%
              </div>
            </div>
          </div>

          {/* Visual Charts Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
            {/* Risk Segments Pie */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '20px', color: '#fff', fontWeight: 700 }}>Risk Segment Distribution</h3>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={getRiskLevelsData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getRiskLevelsData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#101422', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Contract bill comparisons */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '20px', color: '#fff', fontWeight: 700 }}>Avg Monthly Billing by Contract type</h3>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer>
                  <BarChart data={getContractChargesData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: '#101422', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }} />
                    <Bar dataKey="Avg Monthly Charges" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Filtering and Table Ingestion workspace */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
              <h3 style={{ fontSize: '14px', color: '#fff', fontWeight: 700 }}>Batch Predictions Audit Registry</h3>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <input
                    type="text"
                    placeholder="Search Customer ID..."
                    className="input-field"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '36px', height: '36px', fontSize: '12px' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                  <select
                    className="input-field"
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    style={{ height: '36px', padding: '0 12px', fontSize: '12px', width: '130px' }}
                  >
                    <option value="All">All Risks</option>
                    <option value="High">High Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="Low">Low Risk</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Ingestion Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Customer ID</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Contract</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Monthly Bill</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Tenure</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Risk Probability</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px' }}>Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPredictions.map((pred) => {
                    const f = pred.features || {};
                    const level = pred.churn_probability >= 0.7 ? 'High' : pred.churn_probability >= 0.4 ? 'Medium' : 'Low';
                    const badgeClass = level === 'High' ? 'badge-danger' : level === 'Medium' ? 'badge-warning' : 'badge-success';
                    
                    return (
                      <tr key={pred.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>{pred.customer_id}</td>
                        <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{f.Contract || 'Month-to-month'}</td>
                        <td style={{ padding: '12px 8px' }}>${f.MonthlyCharges || '0.00'}</td>
                        <td style={{ padding: '12px 8px' }}>{f.tenure || '0'} mos</td>
                        <td style={{ padding: '12px 8px', fontWeight: 700 }}>{Math.round(pred.churn_probability * 100)}%</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span className={`badge ${badgeClass}`}>{level}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPredictions.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No records match the active search/filter options.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* Core Upload Area */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px', alignItems: 'start' }}>
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Batch Data Ingestion</h2>
            
            <div 
              className={`upload-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                background: isDragging ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <div className="upload-icon" style={{ color: 'rgb(var(--color-primary-light))' }}>
                <Upload size={32} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px', color: '#fff' }}>
                  {file ? file.name : "Drag & Drop customer CSV here"}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports Telco Churn standard columns"}
                </p>
              </div>

              <input
                type="file"
                id="csv-file-input"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              
              <button 
                className="btn-secondary" 
                onClick={() => document.getElementById('csv-file-input').click()}
                disabled={uploading}
              >
                Browse Files
              </button>
            </div>

            {error && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                backgroundColor: 'rgba(239,68,68,0.1)', color: 'rgb(var(--color-danger))',
                padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginTop: '20px', fontSize: '13px'
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {file && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button className="btn-primary" onClick={uploadFile} disabled={uploading}>
                  {uploading ? 'Processing File...' : 'Start Inferences Pipeline'}
                </button>
              </div>
            )}
          </div>

          {/* Audit Jobs Center */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 700 }}>
              Batch Audits Registry
            </h3>

            {jobs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                No batch uploads registered yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                {jobs.map((job) => (
                  <div 
                    key={job.id} 
                    onClick={() => {
                      if (job.status === 'completed') {
                        setSuccessJob(job);
                      }
                    }}
                    style={{ 
                      padding: '12px', background: 'rgba(255,255,255,0.02)', 
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)',
                      fontSize: '12px', cursor: job.status === 'completed' ? 'pointer' : 'default',
                      transition: 'all 0.2s ease'
                    }}
                    className={job.status === 'completed' ? 'hover-card' : ''}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {job.filename}
                      </span>
                      <span className={`badge ${job.status === 'completed' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '8px' }}>
                        {job.status}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      Churned: <strong>{job.churned_records}</strong> / {job.total_records}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>
                      {new Date(job.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Predictions;
