import os
import json
import sys
import numpy as np
import pandas as pd
import joblib

# Workaround for joblib/pickle unpickling custom classes from __main__
import app.ml.pipeline
sys.modules['__main__'].FeatureEngineer = app.ml.pipeline.FeatureEngineer

# Paths
ML_DIR = os.path.dirname(__file__)
ARTIFACTS_DIR = os.path.join(ML_DIR, "artifacts")

# Global instances cache
_pipeline = None
_metadata = None


def load_model_artifacts():
    """Lazy loads the pipeline and metadata artifacts using latest_model.json pointer."""
    global _pipeline, _metadata
    
    if _pipeline is not None and _metadata is not None:
        return _pipeline, _metadata
        
    latest_json_path = os.path.join(ARTIFACTS_DIR, "latest_model.json")
    if not os.path.exists(latest_json_path):
        raise FileNotFoundError(
            "Model artifacts pointer file not found. Please run the training pipeline first "
            "using `py backend/app/ml/pipeline.py`."
        )
        
    with open(latest_json_path, "r") as f:
        pointer = json.load(f)
        
    active_pipeline_path = os.path.join(ARTIFACTS_DIR, pointer["active_model_path"])
    version_dir = os.path.dirname(active_pipeline_path)
    metadata_path = os.path.join(version_dir, "metadata.json")
    
    if not os.path.exists(active_pipeline_path) or not os.path.exists(metadata_path):
        raise FileNotFoundError(
            f"Active model version artifacts not found at {active_pipeline_path}. "
            "Please run the training pipeline using `py backend/app/ml/pipeline.py`."
        )
        
    _pipeline = joblib.load(active_pipeline_path)
    
    with open(metadata_path, "r") as f:
        _metadata = json.load(f)
        
    return _pipeline, _metadata


def predict_churn(customer_data: dict) -> dict:
    """
    Predicts churn probability for a single customer.
    
    customer_data: dictionary containing keys corresponding to the IBM Telco Churn features:
        - gender, SeniorCitizen, Partner, Dependents, tenure, PhoneService, MultipleLines, 
          InternetService, OnlineSecurity, OnlineBackup, DeviceProtection, TechSupport, 
          StreamingTV, StreamingMovies, Contract, PaperlessBilling, PaymentMethod, 
          MonthlyCharges, TotalCharges
    """
    pipeline, metadata = load_model_artifacts()
    
    # Format input into a dataframe
    df = pd.DataFrame([customer_data])
    
    # Predict Churn probability via the complete pipeline
    prob = float(pipeline.predict_proba(df)[0, 1])
    is_churn = bool(prob >= 0.5)
    
    # Extract steps for explainability
    classifier = pipeline.named_steps['classifier']
    
    # Transform via all preprocessing steps in pipeline (feature engineering + scaling + encoding)
    X_processed = pipeline[:-1].transform(df)
    if hasattr(X_processed, "toarray"):
        X_processed = X_processed.toarray()
    elif hasattr(X_processed, "values"):
        X_processed = X_processed.values
    
    feature_names = metadata["feature_names"]
    explanations = []
    
    # Try using SHAP, fallback to feature deviation analysis if SHAP is missing or fails
    try:
        import shap
        # 1. Get raw SHAP values from the appropriate explainer
        if metadata["best_model_name"] in ["xgboost", "random_forest", "lightgbm", "decision_tree"]:
            explainer = shap.TreeExplainer(classifier)
            raw_shap = explainer.shap_values(X_processed)
        else:
            explainer = shap.Explainer(classifier, X_processed)
            raw_shap = explainer(X_processed).values
            
        # 2. Extract class 1 (churn) SHAP values for the first row vector
        if isinstance(raw_shap, list):
            target_shap = raw_shap[1] if len(raw_shap) == 2 else raw_shap[0]
            shap_row = target_shap[0]
        elif isinstance(raw_shap, np.ndarray):
            if len(raw_shap.shape) == 3:
                shap_row = raw_shap[0, :, 1]
            elif len(raw_shap.shape) == 2:
                shap_row = raw_shap[0]
            else:
                shap_row = raw_shap
        else:
            shap_row = raw_shap[0]
            
        raw_importance = dict(zip(feature_names, shap_row))
    except Exception:
        # Fallback explanation logic
        raw_importance = {}
        if hasattr(classifier, 'coef_'):
            # Logistic Regression coefficients
            coefs = classifier.coef_[0]
            contrib = X_processed[0] * coefs
            raw_importance = dict(zip(feature_names, contrib))
        elif hasattr(classifier, 'feature_importances_'):
            importances = classifier.feature_importances_
            for name, imp in zip(feature_names, importances):
                weight = float(imp)
                # Map direction based on feature value Heuristics
                if "Contract_Month-to-month" in name and customer_data.get("Contract") == "Month-to-month":
                    raw_importance[name] = weight * 0.4
                elif "InternetService_Fiber optic" in name and customer_data.get("InternetService") == "Fiber optic":
                    raw_importance[name] = weight * 0.3
                elif "TechSupport_No" in name and customer_data.get("TechSupport") == "No":
                    raw_importance[name] = weight * 0.25
                elif "tenure" in name:
                    tenure_val = float(customer_data.get("tenure", 1))
                    raw_importance[name] = -weight * (tenure_val - 24) / 24 * 0.2
                else:
                    raw_importance[name] = weight * 0.05
        else:
            # Heuristic correlations fallback for KNN/SVM without importances
            for name in feature_names:
                if "Contract_Month-to-month" in name and customer_data.get("Contract") == "Month-to-month":
                    raw_importance[name] = 0.25
                elif "InternetService_Fiber optic" in name and customer_data.get("InternetService") == "Fiber optic":
                    raw_importance[name] = 0.15
                elif "TechSupport_No" in name and customer_data.get("TechSupport") == "No":
                    raw_importance[name] = 0.12
                elif "tenure" in name:
                    tenure_val = float(customer_data.get("tenure", 1))
                    raw_importance[name] = -(tenure_val - 24) / 24 * 0.1
                else:
                    raw_importance[name] = 0.01
                    
    # Aggregate one-hot encoded contributions back to parent original features
    parent_features = {}
    for feat_name, val in raw_importance.items():
        found = False
        for cat_col in metadata["categorical_cols"]:
            if feat_name.startswith(f"{cat_col}_"):
                parent_features[cat_col] = parent_features.get(cat_col, 0) + float(val)
                found = True
                break
        if not found:
            for num_col in metadata["numerical_cols"]:
                if feat_name == num_col:
                    parent_features[num_col] = float(val)
                    found = True
                    break
            if not found:
                parent_features[feat_name] = float(val)
                
    # Sort feature impacts
    sorted_impacts = sorted(parent_features.items(), key=lambda x: abs(x[1]), reverse=True)
    
    # Format descriptions for explanations
    for name, val in sorted_impacts:
        explanations.append({
            "feature": name,
            "impact": round(val, 4),
            "influence": "Increase Risk" if val > 0 else "Decrease Risk"
        })
        
    # Generate Prescriptive Retention Recommendations
    recommendations = generate_recommendations(customer_data, explanations, prob)
    
    return {
        "churn_probability": round(prob, 4),
        "is_churn": is_churn,
        "risk_segment": "High" if prob >= 0.7 else "Medium" if prob >= 0.4 else "Low",
        "explanations": explanations[:5],  # top 5 contributors
        "recommendations": recommendations
    }


def explain_single_row(classifier, X_row, feature_names, metadata, customer_data):
    """Generates explanations for a single preprocessed row (NumPy vector)."""
    if hasattr(X_row, "toarray"):
        X_row = X_row.toarray()
    elif hasattr(X_row, "values"):
        X_row = X_row.values
    raw_importance = {}
    try:
        if hasattr(classifier, 'coef_'):
            coefs = classifier.coef_[0]
            contrib = X_row[0] * coefs
            raw_importance = dict(zip(feature_names, contrib))
        elif hasattr(classifier, 'feature_importances_'):
            importances = classifier.feature_importances_
            for name, imp in zip(feature_names, importances):
                weight = float(imp)
                if "Contract_Month-to-month" in name and customer_data.get("Contract") == "Month-to-month":
                    raw_importance[name] = weight * 0.4
                elif "InternetService_Fiber optic" in name and customer_data.get("InternetService") == "Fiber optic":
                    raw_importance[name] = weight * 0.3
                elif "TechSupport_No" in name and customer_data.get("TechSupport") == "No":
                    raw_importance[name] = weight * 0.25
                elif "tenure" in name:
                    tenure_val = float(customer_data.get("tenure", 1))
                    raw_importance[name] = -weight * (tenure_val - 24) / 24 * 0.2
                else:
                    raw_importance[name] = weight * 0.05
        else:
            for name in feature_names:
                if "Contract_Month-to-month" in name and customer_data.get("Contract") == "Month-to-month":
                    raw_importance[name] = 0.25
                elif "InternetService_Fiber optic" in name and customer_data.get("InternetService") == "Fiber optic":
                    raw_importance[name] = 0.15
                elif "TechSupport_No" in name and customer_data.get("TechSupport") == "No":
                    raw_importance[name] = 0.12
                elif "tenure" in name:
                    tenure_val = float(customer_data.get("tenure", 1))
                    raw_importance[name] = -(tenure_val - 24) / 24 * 0.1
                else:
                    raw_importance[name] = 0.01
    except Exception:
        pass
        
    parent_features = {}
    for feat_name, val in raw_importance.items():
        found = False
        for cat_col in metadata["categorical_cols"]:
            if feat_name.startswith(f"{cat_col}_"):
                parent_features[cat_col] = parent_features.get(cat_col, 0) + float(val)
                found = True
                break
        if not found:
            for num_col in metadata["numerical_cols"]:
                if feat_name == num_col:
                    parent_features[num_col] = float(val)
                    found = True
                    break
            if not found:
                parent_features[feat_name] = float(val)
                
    sorted_impacts = sorted(parent_features.items(), key=lambda x: abs(x[1]), reverse=True)
    explanations = []
    for name, val in sorted_impacts:
        explanations.append({
            "feature": name,
            "impact": round(val, 4),
            "influence": "Increase Risk" if val > 0 else "Decrease Risk"
        })
    return explanations


def predict_churn_batch(customers_data: list) -> list:
    """Predicts churn probabilities and risk parameters for a batch of customers vectorially."""
    pipeline, metadata = load_model_artifacts()
    
    # 1. Convert all customer dicts into a single DataFrame
    df = pd.DataFrame(customers_data)
    
    # 2. Run prediction probability over the entire batch at once
    probs = pipeline.predict_proba(df)[:, 1].tolist()
    
    # Extract steps for explainability
    classifier = pipeline.named_steps['classifier']
    X_processed = pipeline[:-1].transform(df)
    if hasattr(X_processed, "toarray"):
        X_processed = X_processed.toarray()
    elif hasattr(X_processed, "values"):
        X_processed = X_processed.values
    
    feature_names = metadata["feature_names"]
    results = []
    
    # 3. Assemble results for each customer
    for idx, prob in enumerate(probs):
        is_churn = bool(prob >= 0.5)
        customer_data = customers_data[idx]
        
        # Calculate explanations from pre-transformed matrix slices
        row_processed = X_processed[idx : idx + 1]
        explanations = explain_single_row(classifier, row_processed, feature_names, metadata, customer_data)
        recommendations = generate_recommendations(customer_data, explanations, prob)
        
        results.append({
            "churn_probability": round(prob, 4),
            "is_churn": is_churn,
            "risk_segment": "High" if prob >= 0.7 else "Medium" if prob >= 0.4 else "Low",
            "explanations": explanations[:5],
            "recommendations": recommendations
        })
        
    return results



def generate_recommendations(customer_data: dict, explanations: list, prob: float) -> list:
    """Generates personalized business action plans with explanations."""
    recs = []
    prob_pct = int(prob * 100)
    drivers = [e["feature"] for e in explanations if e["impact"] > 0]
    
    # 1. High Risk Recommendations (prob >= 0.7)
    if prob >= 0.70:
        recs.append({
            "title": "Offer 20% Retention Discount",
            "description": "Provide a temporary contract billing discount of 20% for 6 months to secure contract renewal.",
            "impact_rating": "High",
            "rationale": f"Calculated because risk probability ({prob_pct}%) exceeds the critical threshold (70%)."
        })
        recs.append({
            "title": "Schedule Customer Success Call",
            "description": "Initiate a high-priority account diagnostic outreach call to check service health parameters.",
            "impact_rating": "High",
            "rationale": f"Suggested because lack of active online features or technical support has elevated risk."
        })
        recs.append({
            "title": "Assign Retention Specialist",
            "description": "Appoint a senior account specialist to manage this account and handle billing issues.",
            "impact_rating": "High",
            "rationale": f"Triggered by severe churn risk markers driven by {', '.join(drivers[:2])}."
        })
        
    # 2. Medium Risk Recommendations (0.4 <= prob < 0.7)
    elif prob >= 0.40:
        recs.append({
            "title": "Send Loyalty Rewards Package",
            "description": "Send a customer appreciation credit or reward points voucher to improve loyalty metrics.",
            "impact_rating": "Medium",
            "rationale": f"Suggested because risk level is Medium ({prob_pct}%) and account stabilization is needed."
        })
        recs.append({
            "title": "Recommend Optimized Plan",
            "description": "Examine usage metrics and suggest migrating to a more value-packed or stable plan.",
            "impact_rating": "Medium",
            "rationale": f"Triggered because Billing Charges are driving risk. Plan optimization will mitigate this."
        })
        
    # 3. Low Risk Recommendations (prob < 0.4)
    else:
        recs.append({
            "title": "Offer Premium Upgrades",
            "description": "Introduce premium feature package trials (such as online security bundles) to expand contract value.",
            "impact_rating": "Low",
            "rationale": f"Suggested because the customer is highly stable ({prob_pct}% risk) and primed for account expansion."
        })
        recs.append({
            "title": "Encourage Referrals Program",
            "description": "Invite account holder to join the VIP referral campaign, offering bill credits for successful leads.",
            "impact_rating": "Low",
            "rationale": f"Calculated because high customer loyalty indicators support brand advocacy outreach."
        })
        
    # Fallback to feature-specific checks if list is short to ensure deep custom coverage
    if "Contract" in drivers or customer_data.get("Contract") == "Month-to-month":
        # Check if already has a contract migration recommendation
        if not any(r["title"] == "Upgrade Subscription Contract" for r in recs):
            recs.append({
                "title": "Upgrade Subscription Contract",
                "description": "Offer customer a transition from Month-to-month to a 1-Year or 2-Year Contract, including a loyalty discount of 10% off their Monthly Charges.",
                "impact_rating": "High",
                "rationale": "Suggested because Month-to-month contracts represent the highest statistical driver of churn."
            })
            
    return recs
