from fastapi import APIRouter, Depends
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.auth import get_current_user
from app.models.user import User
from app.models.prediction import Prediction
from typing import Dict, Any, List

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=Dict[str, Any])
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aggregate history logs to output structured metrics for frontend dashboard visualization."""
    total_predictions = db.query(Prediction).count()
    
    if total_predictions == 0:
        return {
            "total_predictions": 0,
            "churn_rate": 0.0,
            "avg_probability": 0.0,
            "segments": {"Low": 0, "Medium": 0, "High": 0},
            "high_risk_alerts": [],
            "contract_distribution": [],
            "avg_charges_comparison": {"churner": 0.0, "retained": 0.0}
        }
        
    # Churn count
    churn_count = db.query(Prediction).filter(Prediction.is_churn == True).count()
    churn_rate = round((churn_count / total_predictions) * 100, 2)
    
    # Avg probability
    avg_prob = db.query(func.avg(Prediction.churn_probability)).scalar() or 0.0
    avg_prob = round(float(avg_prob) * 100, 2)
    
    # Segments count
    high_risk = db.query(Prediction).filter(Prediction.churn_probability >= 0.70).count()
    med_risk = db.query(Prediction).filter(Prediction.churn_probability >= 0.40, Prediction.churn_probability < 0.70).count()
    low_risk = db.query(Prediction).filter(Prediction.churn_probability < 0.40).count()
    
    # Fetch 5 highest risk predictions for immediate notification alerts
    alerts_query = db.query(Prediction).filter(Prediction.churn_probability >= 0.75).order_by(desc(Prediction.churn_probability)).limit(5).all()
    
    high_risk_alerts = []
    for pred in alerts_query:
        # Extract features of interest
        feat = pred.features or {}
        high_risk_alerts.append({
            "id": pred.id,
            "customer_id": pred.customer_id,
            "probability": round(pred.churn_probability * 100, 2),
            "tenure": feat.get("tenure", 0),
            "monthly_charges": feat.get("MonthlyCharges", 0.0),
            "contract": feat.get("Contract", "Unknown"),
            "created_at": pred.created_at
        })
        
    # Analyze Contract distribution among churned customers vs non-churned
    # Since sqlite and postgres JSON queries differ, we can pull the latest 500 predictions
    # and perform grouping in Python safely, ensuring database independence.
    sample_preds = db.query(Prediction).order_by(desc(Prediction.created_at)).limit(500).all()
    
    contracts = {"Month-to-month": 0, "One year": 0, "Two year": 0}
    retained_charges = []
    churned_charges = []
    
    for pred in sample_preds:
        feat = pred.features or {}
        contract = feat.get("Contract", "Month-to-month")
        if contract in contracts:
            contracts[contract] += 1
            
        charge = float(feat.get("MonthlyCharges", 0.0))
        if pred.is_churn:
            churned_charges.append(charge)
        else:
            retained_charges.append(charge)
            
    contract_distribution = [{"name": k, "value": v} for k, v in contracts.items()]
    
    avg_retained_charge = round(sum(retained_charges) / len(retained_charges), 2) if retained_charges else 0.0
    avg_churned_charge = round(sum(churned_charges) / len(churned_charges), 2) if churned_charges else 0.0
    
    return {
        "total_predictions": total_predictions,
        "churn_rate": churn_rate,
        "avg_probability": avg_prob,
        "segments": {
            "Low": low_risk,
            "Medium": med_risk,
            "High": high_risk
        },
        "high_risk_alerts": high_risk_alerts,
        "contract_distribution": contract_distribution,
        "avg_charges_comparison": {
            "retained": avg_retained_charge,
            "churner": avg_churned_charge
        }
    }
