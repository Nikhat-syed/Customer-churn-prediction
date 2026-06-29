import uuid
from sqlalchemy import Column, String, Float, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.db.session import Base
from app.models.user import User

class PredictionJob(Base):
    __tablename__ = "prediction_jobs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=True)  # Name of uploaded file
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    total_records = Column(Integer, default=0)
    churned_records = Column(Integer, default=0)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("prediction_jobs.id"), nullable=True)
    customer_id = Column(String(100), index=True, nullable=False)
    features = Column(JSON, nullable=False)  # Store exact input values
    churn_probability = Column(Float, nullable=False)
    is_churn = Column(Boolean, nullable=False)
    explanation = Column(JSON, nullable=True)  # SHAP value impact breakdown
    created_at = Column(DateTime(timezone=True), server_default=func.now())
