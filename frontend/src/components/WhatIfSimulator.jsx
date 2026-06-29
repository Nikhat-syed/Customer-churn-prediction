import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Play, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const WhatIfSimulator = () => {
  const { token } = useAuth();
  
  // Default values based on IBM Telco Churn structure
  const [customerID, setCustomerID] = useState("SIM-101");
  const [features, setFeatures] = useState({
    gender: "Female",
    SeniorCitizen: 0,
    Partner: "Yes",
    Dependents: "No",
    tenure: 12,
    PhoneService: "Yes",
    MultipleLines: "No",
    InternetService: "Fiber optic",
    OnlineSecurity: "No",
    OnlineBackup: "Yes",
    DeviceProtection: "No",
    TechSupport: "No",
    StreamingTV: "Yes",
    StreamingMovies: "No",
    Contract: "Month-to-month",
    PaperlessBilling: "Yes",
    PaymentMethod: "Electronic check",
    MonthlyCharges: 75.00,
    TotalCharges: 900.00
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Run prediction
  const runPrediction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/predict/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_id: customerID,
          features: {
            ...features,
            TotalCharges: String(features.MonthlyCharges * features.tenure)
          }
        })
      });

      if (!res.ok) {
        throw new Error('Prediction API failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run prediction automatically when sliders or inputs change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      runPrediction();
    }, 300); // 300ms debounce to avoid overwhelming the server during slider drags

    return () => clearTimeout(delayDebounce);
  }, [features]);

  const handleFeatureChange = (key, value) => {
    setFeatures(prev => {
      const newFeatures = { ...prev, [key]: value };
      
      // Keep total charges mathematically aligned
      if (key === 'tenure' || key === 'MonthlyCharges') {
        newFeatures.TotalCharges = String(Number(newFeatures.MonthlyCharges) * Number(newFeatures.tenure));
      }
      
      // Auto-set Internet dependencies if Internet is 'No'
      if (key === 'InternetService' && value === 'No') {
        newFeatures.OnlineSecurity = "No internet service";
        newFeatures.OnlineBackup = "No internet service";
        newFeatures.DeviceProtection = "No internet service";
        newFeatures.TechSupport = "No internet service";
        newFeatures.StreamingTV = "No internet service";
        newFeatures.StreamingMovies = "No internet service";
      } else if (key === 'InternetService' && prev.InternetService === 'No' && value !== 'No') {
        newFeatures.OnlineSecurity = "No";
        newFeatures.OnlineBackup = "No";
        newFeatures.DeviceProtection = "No";
        newFeatures.TechSupport = "No";
        newFeatures.StreamingTV = "No";
        newFeatures.StreamingMovies = "No";
      }

      return newFeatures;
    });
  };

  // Circular gauge parameters
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const churnProb = result ? result.churn_probability : 0;
  const strokeDashoffset = circumference - (churnProb * circumference);

  // Dynamic status color for gauge
  const getGaugeColor = (prob) => {
    if (prob < 0.4) return 'rgb(var(--color-success))';
    if (prob < 0.7) return 'rgb(var(--color-warning))';
    return 'rgb(var(--color-danger))';
  };

  return (
    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '30px', alignItems: 'start' }}>
      {/* Simulation Inputs */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} style={{ color: 'rgb(var(--color-secondary-light))' }} />
          Simulation Control Panel
        </h2>

        <div className="whatif-grid">
          <div>
            <label className="input-label">Tenure (Months): {features.tenure}</label>
            <input 
              type="range" 
              min="1" 
              max="72" 
              value={features.tenure} 
              onChange={(e) => handleFeatureChange('tenure', parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'rgb(var(--color-primary))' }}
            />
          </div>

          <div>
            <label className="input-label">Monthly Bill: ${features.MonthlyCharges}</label>
            <input 
              type="range" 
              min="18" 
              max="120" 
              value={features.MonthlyCharges} 
              onChange={(e) => handleFeatureChange('MonthlyCharges', parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'rgb(var(--color-primary))' }}
            />
          </div>

          <div>
            <label className="input-label">Contract Type</label>
            <select 
              className="input-field"
              value={features.Contract}
              onChange={(e) => handleFeatureChange('Contract', e.target.value)}
            >
              <option value="Month-to-month">Month-to-month</option>
              <option value="One year">One year</option>
              <option value="Two year">Two year</option>
            </select>
          </div>

          <div>
            <label className="input-label">Internet Service</label>
            <select 
              className="input-field"
              value={features.InternetService}
              onChange={(e) => handleFeatureChange('InternetService', e.target.value)}
            >
              <option value="DSL">DSL</option>
              <option value="Fiber optic">Fiber optic</option>
              <option value="No">No Internet Service</option>
            </select>
          </div>

          {features.InternetService !== 'No' && (
            <>
              <div>
                <label className="input-label">Tech Support Service</label>
                <select 
                  className="input-field"
                  value={features.TechSupport}
                  onChange={(e) => handleFeatureChange('TechSupport', e.target.value)}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className="input-label">Online Security</label>
                <select 
                  className="input-field"
                  value={features.OnlineSecurity}
                  onChange={(e) => handleFeatureChange('OnlineSecurity', e.target.value)}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="input-label">Payment Method</label>
            <select 
              className="input-field"
              value={features.PaymentMethod}
              onChange={(e) => handleFeatureChange('PaymentMethod', e.target.value)}
            >
              <option value="Electronic check">Electronic check</option>
              <option value="Mailed check">Mailed check</option>
              <option value="Bank transfer (automatic)">Bank transfer (automatic)</option>
              <option value="Credit card (automatic)">Credit card (automatic)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Paperless Billing</label>
            <select 
              className="input-field"
              value={features.PaperlessBilling}
              onChange={(e) => handleFeatureChange('PaperlessBilling', e.target.value)}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          <div>
            <label className="input-label">Senior Citizen</label>
            <select 
              className="input-field"
              value={features.SeniorCitizen}
              onChange={(e) => handleFeatureChange('SeniorCitizen', parseInt(e.target.value))}
            >
              <option value={1}>Yes</option>
              <option value={0}>No</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button className="btn-primary" onClick={runPrediction} disabled={loading}>
            <Play size={16} />
            {loading ? 'Analyzing...' : 'Run Simulation'}
          </button>
          
          <div style={{ alignSelf: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
            Adjust parameters to see instant risk calculations and SHAP feedback.
          </div>
        </div>
      </div>

      {/* Churn Output Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Gauge Card */}
        <div className="glass-panel gauge-container animate-fade-in" style={{ animationDuration: '0.4s', padding: '24px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '20px', fontWeight: 700, letterSpacing: '0.05em' }}>
            Risk Analysis Gauge
          </h3>
          
          <div className="gauge-track" style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: '180px', height: '180px', margin: '0 auto 16px' }}>
            <svg className="gauge-svg" style={{ width: '180px', height: '180px', transform: 'rotate(-90deg)' }}>
              <circle className="gauge-circle-bg" cx="90" cy="90" r={radius} style={{ fill: 'none', stroke: 'rgba(255,255,255,0.03)', strokeWidth: '10px' }} />
              <circle 
                className="gauge-circle-fill" 
                cx="90" 
                cy="90" 
                r={radius} 
                stroke={getGaugeColor(churnProb)}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  fill: 'none',
                  strokeWidth: '10px',
                  strokeLinecap: 'round',
                  transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.6s ease'
                }}
              />
            </svg>
            <div className="gauge-value" style={{ position: 'absolute', fontSize: '32px', fontWeight: 800, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.1' }}>
              <span>{Math.round(churnProb * 100)}%</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>probability</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span className={`badge ${churnProb >= 0.7 ? 'badge-danger' : churnProb >= 0.4 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '20px' }}>
              {result ? result.risk_segment : 'Low'} Risk Level
            </span>
          </div>
        </div>

        {/* Confidence Score Card */}
        {result && (
          <div className="glass-panel animate-fade-in" style={{ animationDuration: '0.5s', padding: '24px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 700, letterSpacing: '0.05em' }}>
              Decision Confidence
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>
                  {Math.round((result.confidence_score || Math.abs(churnProb - 0.5) * 2) * 100)}%
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Model Certainty
                </span>
              </div>
              
              {/* Progress track */}
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${Math.round((result.confidence_score || Math.abs(churnProb - 0.5) * 2) * 100)}%`,
                    background: 'linear-gradient(90deg, rgb(var(--color-primary-light)) 0%, rgb(var(--color-secondary-light)) 100%)',
                    borderRadius: '3px',
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                />
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                {Math.abs(churnProb - 0.5) * 2 > 0.6 
                  ? "Highly certain classification decision. Features clearly align with the class distribution."
                  : Math.abs(churnProb - 0.5) * 2 > 0.2
                  ? "Stable prediction. Moderate feature divergence present."
                  : "Borderline classification decision. Customer displays mixed traits."
                }
              </p>
            </div>
          </div>
        )}

        {/* Feature Drivers (SHAP) */}
        {result && result.explanations && (
          <div className="glass-panel animate-fade-in" style={{ animationDuration: '0.6s', padding: '24px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 700, letterSpacing: '0.05em' }}>
              Explainable AI (SHAP Metrics)
            </h3>

            {/* Natural Language Explanation */}
            <div style={{ 
              backgroundColor: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '16px', 
              marginBottom: '20px',
              fontSize: '13px', 
              lineHeight: '1.5',
              color: 'var(--text-secondary)'
            }}>
              <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>AI Narrative Explanation:</strong>
              {(() => {
                const positives = result.explanations.filter(e => e.impact > 0);
                const negatives = result.explanations.filter(e => e.impact < 0);
                const mainPos = positives.slice(0, 2).map(e => e.feature.replace(/_/g, ' ')).join(" and ");
                const mainNeg = negatives.slice(0, 1).map(e => e.feature.replace(/_/g, ' ')).join("");
                
                let text = `The customer is classified as ${result.risk_segment} risk with a ${Math.round(churnProb * 100)}% probability of churning. `;
                if (positives.length > 0) {
                  text += `This is primarily driven by high-risk features like ${mainPos}. `;
                }
                if (negatives.length > 0) {
                  text += `However, these risk factors are partially offset and mitigated by stable features like ${mainNeg}.`;
                }
                return text;
              })()}
            </div>

            {/* Force Plot Simulation */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <span>◀ Mitigating Factors</span>
                <span>Active Risk (Output: {Math.round(churnProb * 100)}%)</span>
                <span>Risk Drivers ▶</span>
              </div>
              <div style={{ position: 'relative', height: '28px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-color)' }}>
                {/* Mitigating/Green push (from left) */}
                <div style={{
                  width: `${Math.round(Math.max(0, 0.5 - churnProb) * 100)}%`,
                  backgroundColor: 'rgba(16, 185, 129, 0.4)',
                  borderRight: '2px solid rgb(var(--color-success))',
                  transition: 'width 0.5s ease-out'
                }} />
                <div style={{ flexGrow: 1 }} />
                {/* Risk/Red push (from right) */}
                <div style={{
                  width: `${Math.round(Math.max(0, churnProb - 0.25) * 100)}%`,
                  backgroundColor: 'rgba(239, 68, 68, 0.4)',
                  borderLeft: '2px solid rgb(var(--color-danger))',
                  transition: 'width 0.5s ease-out'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Base (25%)</span>
                <span>Current: {Math.round(churnProb * 100)}%</span>
              </div>
            </div>

            {/* Waterfall Steps Representation */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>
                Waterfall Risk Progression
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(() => {
                  let runningTotal = 0.25; // Baseline
                  const steps = [{ label: "Baseline Average", impact: 0.25, total: 0.25 }];
                  result.explanations.slice(0, 4).forEach(e => {
                    runningTotal += e.impact;
                    steps.push({ label: e.feature, impact: e.impact, total: runningTotal });
                  });
                  
                  return steps.map((step, sIdx) => {
                    const isPositive = step.impact > 0;
                    return (
                      <div key={sIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{step.label.replace(/_/g, ' ')}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ 
                            color: sIdx === 0 ? '#fff' : isPositive ? 'rgb(var(--color-danger))' : 'rgb(var(--color-success))',
                            fontWeight: 600
                          }}>
                            {sIdx === 0 ? '' : isPositive ? `+${Math.round(step.impact*100)}%` : `${Math.round(step.impact*100)}%`}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({Math.round(Math.max(0, Math.min(1, step.total))*100)}%)</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Positive vs Negative Breakdown Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <h4 style={{ fontSize: '11px', color: 'rgb(var(--color-danger))', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Risk Drivers (+)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.explanations.filter(e => e.impact > 0).slice(0, 3).map((e, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px', background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.1)', borderRadius: '4px' }}>
                      {e.feature.replace(/_/g, ' ')} (+{Math.round(e.impact * 100)}%)
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '11px', color: 'rgb(var(--color-success))', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Mitigating Factors (-)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.explanations.filter(e => e.impact < 0).slice(0, 3).map((e, idx) => (
                    <div key={idx} style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '6px', background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: '4px' }}>
                      {e.feature.replace(/_/g, ' ')} ({Math.round(e.impact * 100)}%)
                    </div>
                  ))}
                  {result.explanations.filter(e => e.impact < 0).length === 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No mitigating factors</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Action Recommendations */}
        {result && result.recommendations && (
          <div className="glass-panel animate-fade-in" style={{ animationDuration: '0.7s', padding: '24px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 700, letterSpacing: '0.05em' }}>
              Action Strategy
            </h3>
            
            <div className="rec-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {result.recommendations.map((rec, idx) => (
                <div 
                  key={idx} 
                  className="rec-item"
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    borderLeft: `4px solid ${rec.impact_rating === 'High' ? 'rgb(var(--color-danger))' : 'rgb(var(--color-primary-light))'}`,
                    borderRadius: '8px',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <div className="rec-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div className="rec-title" style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{rec.title}</div>
                    <span 
                      className={`badge ${rec.impact_rating === 'High' ? 'badge-danger' : 'badge-warning'}`}
                      style={{ fontSize: '9px', padding: '2px 6px' }}
                    >
                      {rec.impact_rating} Impact
                    </span>
                  </div>
                  <div className="rec-desc" style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{rec.description}</div>
                  {rec.rationale && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                      <strong>Suggested Rationale:</strong> <span>{rec.rationale}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatIfSimulator;
