import React from 'react';
import { Cpu, ShieldCheck, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

const AboutModel = () => {
  const steps = [
    {
      title: "1. Data Cleaning",
      desc: "Handles missing entries, removes outliers, cleans empty string formatting (like space inputs inside TotalCharges), and maps target columns to binary categories. This guarantees high quality, standard inputs and avoids code execution errors."
    },
    {
      title: "2. Encoding",
      desc: "Converts categorical textual features (e.g. Contract, PaymentMethod, InternetService) into numeric vectors via One-Hot encoding. Machine learning models require mathematical matrices for computation."
    },
    {
      title: "3. Scaling",
      desc: "Standardizes numerical column ranges (like MonthlyCharges and tenure) to a shared scale (mean=0, variance=1) using StandardScaler. This prevents features with large magnitudes from dominating the models."
    },
    {
      title: "4. Feature Engineering",
      desc: "Creates domain-specific variables like ChargesPerTenure, ExpectedTotalCharges, and flags like FiberOpticNoSupport. This provides the model with explicit interaction patterns, boosting classification predictive power."
    },
    {
      title: "5. Train-Test Split",
      desc: "Splits data randomly (using stratification to maintain churn proportions) into 80% training and 20% test sets, ensuring the model's accuracy is tested on data it has never seen, preventing overfitting."
    },
    {
      title: "6. Cross Validation",
      desc: "Utilizes Stratified K-Fold cross validation during training. Iteratively fits and scores models across multiple data subsets to establish low-variance, robust estimates of model stability."
    },
    {
      title: "7. Hyperparameter Tuning",
      desc: "Runs GridSearchCV to find optimal estimator configurations (e.g. regularization C value, tree depths, learning rates) maximizing the F1-Score instead of relying on default parameters."
    },
    {
      title: "8. Model Saving",
      desc: "Serializes the complete Scikit-Learn Pipeline (FeatureEngineer + preprocessor + classifier) as a single binary joblib file, allowing the API to execute predictions instantly without retraining."
    },
    {
      title: "9. Model Versioning",
      desc: "Archives serialized models under structured version paths (e.g. models/v1.0.1/) and registers active metadata. This makes deployment reproducible and allows instant version rollbacks."
    },
    {
      title: "10. Prediction Pipeline",
      desc: "Encapsulates the end-to-end steps (engineering, scaling, encoding, classification) in a single deployed pipeline. This guarantees training-serving data parity and completely avoids data leakage."
    }
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Active Model Specs */}
      <div className="glass-panel" style={{ padding: '30px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(6,182,212,0.1) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={24} style={{ color: 'rgb(var(--color-primary-light))' }} />
          Active Model: RetainAI Churn Classifier
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: '800px' }}>
          The active classification engine uses a **Logistic Regression** model optimized via Stratified K-Fold grid search. The model takes 19 primary client variables, computes 5 engineered features, and returns a probability score of churn.
        </p>
        
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <strong>Engine:</strong> Scikit-Learn Pipeline
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <strong>Version:</strong> v1.0.1 (Released)
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <strong>Selection Metric:</strong> F1-Score (0.8889)
          </span>
        </div>
      </div>

      {/* 10 Pipeline Steps List */}
      <div className="glass-panel" style={{ padding: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={20} style={{ color: '#10b981' }} />
          Machine Learning Pipeline Architecture (10 Steps)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              style={{ 
                padding: '20px', 
                background: 'rgba(255,255,255,0.01)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>{step.title}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default AboutModel;
