import csv
import io
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.session import get_db
from app.api.auth import get_current_user, log_audit
from app.models.user import User
from app.models.prediction import Prediction, PredictionJob
from app.schemas.prediction import (
    SinglePredictionRequest, SinglePredictionResponse, 
    PredictionJobOut, PredictionOut
)
from pydantic import BaseModel
from app.ml.model import predict_churn, predict_churn_batch

router = APIRouter(prefix="/predict", tags=["Predictions"])

# Default feature mapping helper to handle CSV rows with missing columns
DEFAULT_FEATURES = {
    "gender": "Male",
    "SeniorCitizen": 0,
    "Partner": "No",
    "Dependents": "No",
    "tenure": 1,
    "PhoneService": "Yes",
    "MultipleLines": "No",
    "InternetService": "No",
    "OnlineSecurity": "No internet service",
    "OnlineBackup": "No internet service",
    "DeviceProtection": "No internet service",
    "TechSupport": "No internet service",
    "StreamingTV": "No internet service",
    "StreamingMovies": "No internet service",
    "Contract": "Month-to-month",
    "PaperlessBilling": "Yes",
    "PaymentMethod": "Mailed check",
    "MonthlyCharges": 20.0,
    "TotalCharges": 20.0
}


@router.post("/single", response_model=SinglePredictionResponse)
def predict_single(
    payload: SinglePredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Predict churn risk for a single customer and log results in database."""
    features_dict = payload.features.model_dump()
    
    # Run prediction
    try:
        res = predict_churn(features_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference Engine failed: {str(e)}"
        )
        
    # Log prediction in DB
    db_pred = Prediction(
        customer_id=payload.customer_id,
        features=features_dict,
        churn_probability=res["churn_probability"],
        is_churn=res["is_churn"],
        explanation=res["explanations"]
    )
    db.add(db_pred)
    db.commit()
    db.refresh(db_pred)
    
    log_audit(
        db,
        action="Single Prediction Run",
        details=f"CustomerID: {payload.customer_id}. Churn Probability: {int(res['churn_probability'] * 100)}%. Risk Segment: {res['risk_segment']}.",
        user_id=current_user.id,
        user_email=current_user.email
    )
    
    return {
        "customer_id": payload.customer_id,
        "churn_probability": res["churn_probability"],
        "is_churn": res["is_churn"],
        "risk_segment": res["risk_segment"],
        "explanations": res["explanations"],
        "recommendations": res["recommendations"]
    }


@router.post("/bulk", response_model=PredictionJobOut)
async def predict_bulk(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingest a CSV of customer records, parse variables, run inferences,
    and persist results within an audited PredictionJob.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a CSV format."
        )
        
    try:
        content = await file.read()
        csv_file = io.StringIO(content.decode("utf-8"))
        reader = csv.DictReader(csv_file)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse CSV file: {str(e)}"
        )
        
    # Standardize headers (strip whitespace and convert lowercase)
    headers = [h.strip() for h in reader.fieldnames] if reader.fieldnames else []
    # Create lower case lookup
    header_lookup = {h.lower(): h for h in headers}
    
    # Create bulk job entry
    job = PredictionJob(
        filename=file.filename,
        status="processing",
        created_by=current_user.id
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    total_records = 0
    churned_records = 0
    predictions_to_add = []
    
    try:
        features_list = []
        customer_ids = []
        
        for row in reader:
            # Map columns to required schema fields
            customer_id = row.get("customerID") or row.get("customer_id") or f"CUST-{uuid.uuid4().hex[:6].upper()}"
            customer_ids.append(customer_id)
            
            # Map features with fallback defaults
            feat = {}
            for target_key, default_val in DEFAULT_FEATURES.items():
                csv_key = header_lookup.get(target_key.lower())
                val = row.get(csv_key) if csv_key else None
                
                if val is None or val.strip() == "":
                    feat[target_key] = default_val
                else:
                    if isinstance(default_val, int):
                        try:
                            feat[target_key] = int(val)
                        except ValueError:
                            feat[target_key] = default_val
                    elif isinstance(default_val, float):
                        try:
                            feat[target_key] = float(val)
                        except ValueError:
                            feat[target_key] = default_val
                    else:
                        feat[target_key] = val
            features_list.append(feat)
            
        if features_list:
            # Run batch inferences vectorially
            batch_results = predict_churn_batch(features_list)
            
            for idx, res in enumerate(batch_results):
                total_records += 1
                if res["is_churn"]:
                    churned_records += 1
                    
                db_pred = Prediction(
                    job_id=job.id,
                    customer_id=customer_ids[idx],
                    features=features_list[idx],
                    churn_probability=res["churn_probability"],
                    is_churn=res["is_churn"],
                    explanation=res["explanations"]
                )
                predictions_to_add.append(db_pred)
                
            # Bulk database writes
            db.add_all(predictions_to_add)
            
        # Update job status
        job.status = "completed"
        job.total_records = total_records
        job.churned_records = churned_records
        db.commit()
        
        log_audit(
            db,
            action="Batch CSV Upload Run",
            details=f"File: {file.filename}. Ingested: {total_records}. High Risk Flagged: {churned_records}.",
            user_id=current_user.id,
            user_email=current_user.email
        )
        
    except Exception as e:
        job.status = "failed"
        db.commit()
        log_audit(
            db,
            action="Batch CSV Upload Failure",
            details=f"File: {file.filename}. Error: {str(e)}",
            user_id=current_user.id,
            user_email=current_user.email
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error occurred during bulk batch processing: {str(e)}"
        )
        
    return job


@router.get("/history", response_model=List[PredictionOut])
def get_prediction_history(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    is_churn: Optional[bool] = None,
    job_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve historical logs of predictions run, ordered newest first."""
    skip = (page - 1) * limit
    query = db.query(Prediction)
    
    if search:
        query = query.filter(Prediction.customer_id.ilike(f"%{search}%"))
        
    if is_churn is not None:
        query = query.filter(Prediction.is_churn == is_churn)
        
    if job_id:
        query = query.filter(Prediction.job_id == job_id)
        
    results = query.order_by(desc(Prediction.created_at)).offset(skip).limit(limit).all()
    return results


@router.get("/jobs", response_model=List[PredictionJobOut])
def get_prediction_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve list of all batch CSV predictions audit log."""
    return db.query(PredictionJob).order_by(desc(PredictionJob.created_at)).all()


class EmailReportRequest(BaseModel):
    customer_id: str
    email: str


@router.post("/email-report")
def email_report(
    payload: EmailReportRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Mock endpoint to email a customer churn risk report.
    Logs execution and simulates emailing.
    """
    import logging
    logger = logging.getLogger("churn_api")
    logger.info(f"User {current_user.email} triggered churn risk email report for customer {payload.customer_id} to {payload.email}")
    return {"message": f"Successfully emailed churn risk report for customer {payload.customer_id} to {payload.email}."}


@router.delete("/history/{prediction_id}")
def delete_prediction(
    prediction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows administrators and analysts to delete historical inference records with audit logging."""
    pred = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not pred:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction record not found."
        )
        
    customer_id = pred.customer_id
    db.delete(pred)
    db.commit()
    
    log_audit(
        db,
        action="Delete Prediction Record",
        details=f"Deleted log record for CustomerID: {customer_id} (Record ID: {prediction_id}).",
        user_id=current_user.id,
        user_email=current_user.email
    )
    return {"message": "Prediction record deleted successfully."}
