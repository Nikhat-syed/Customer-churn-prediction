import os
import pytest
import pandas as pd
import numpy as np
from app.ml.pipeline import clean_and_prepare_data, generate_synthetic_data
from app.ml.model import load_model_artifacts, predict_churn


def test_synthetic_data_generation():
    """Verify synthetic generator generates exact columns and rows required."""
    df = generate_synthetic_data(num_rows=50)
    assert len(df) == 50
    assert "customerID" in df.columns
    assert "Churn" in df.columns


def test_clean_and_prepare_data():
    """Verify numeric cleaning and target transformation."""
    raw_data = pd.DataFrame({
        "customerID": ["123", "456"],
        "MonthlyCharges": [50.0, 75.0],
        "tenure": [10, 20],
        "TotalCharges": ["500.0", " "],  # Test spaces cleaning
        "Churn": ["Yes", "No"]
    })
    
    cleaned = clean_and_prepare_data(raw_data)
    
    # Empty space should impute to MonthlyCharges * tenure = 75.0 * 20 = 1500.0
    assert cleaned.loc[1, "TotalCharges"] == 1500.0
    assert cleaned.loc[0, "TotalCharges"] == 500.0
    assert cleaned.loc[0, "Churn"] == 1
    assert cleaned.loc[1, "Churn"] == 0


def test_predict_churn_wrapper():
    """Verify wrapper output schemas, risk segments, and classifications."""
    mock_customer = {
        "gender": "Female",
        "SeniorCitizen": 0,
        "Partner": "Yes",
        "Dependents": "No",
        "tenure": 12,
        "PhoneService": "Yes",
        "MultipleLines": "No",
        "InternetService": "Fiber optic",
        "OnlineSecurity": "No",
        "OnlineBackup": "Yes",
        "DeviceProtection": "No",
        "TechSupport": "No",
        "StreamingTV": "Yes",
        "StreamingMovies": "No",
        "Contract": "Month-to-month",
        "PaperlessBilling": "Yes",
        "PaymentMethod": "Electronic check",
        "MonthlyCharges": 75.00,
        "TotalCharges": "900.00"
    }
    
    res = predict_churn(mock_customer)
    
    assert "churn_probability" in res
    assert "is_churn" in res
    assert "risk_segment" in res
    assert "explanations" in res
    assert "recommendations" in res
    
    assert 0.0 <= res["churn_probability"] <= 1.0
    assert res["risk_segment"] in ["High", "Medium", "Low"]
    assert len(res["explanations"]) > 0
    assert len(res["recommendations"]) > 0
