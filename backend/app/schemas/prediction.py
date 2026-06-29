from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime

class CustomerFeatures(BaseModel):
    gender: str = Field(..., description="gender: Female, Male")
    SeniorCitizen: int = Field(..., description="SeniorCitizen: 0, 1")
    Partner: str = Field(..., description="Partner: Yes, No")
    Dependents: str = Field(..., description="Dependents: Yes, No")
    tenure: int = Field(..., description="tenure: Number of months")
    PhoneService: str = Field(..., description="PhoneService: Yes, No")
    MultipleLines: str = Field(..., description="MultipleLines: No phone service, No, Yes")
    InternetService: str = Field(..., description="InternetService: DSL, Fiber optic, No")
    OnlineSecurity: str = Field(..., description="OnlineSecurity: Yes, No, No internet service")
    OnlineBackup: str = Field(..., description="OnlineBackup: Yes, No, No internet service")
    DeviceProtection: str = Field(..., description="DeviceProtection: Yes, No, No internet service")
    TechSupport: str = Field(..., description="TechSupport: Yes, No, No internet service")
    StreamingTV: str = Field(..., description="StreamingTV: Yes, No, No internet service")
    StreamingMovies: str = Field(..., description="StreamingMovies: Yes, No, No internet service")
    Contract: str = Field(..., description="Contract: Month-to-month, One year, Two year")
    PaperlessBilling: str = Field(..., description="PaperlessBilling: Yes, No")
    PaymentMethod: str = Field(..., description="PaymentMethod: Electronic check, Mailed check, Bank transfer (automatic), Credit card (automatic)")
    MonthlyCharges: float = Field(..., description="MonthlyCharges: The amount charged to the customer monthly")
    TotalCharges: Optional[Any] = Field(None, description="TotalCharges: The total amount charged to the customer (float or string)")


class SinglePredictionRequest(BaseModel):
    customer_id: str
    features: CustomerFeatures


class FeatureExplanation(BaseModel):
    feature: str
    impact: float
    influence: str  # Increase Risk, Decrease Risk


class Recommendation(BaseModel):
    title: str
    description: str
    impact_rating: str  # High, Medium, Low
    rationale: Optional[str] = None


class SinglePredictionResponse(BaseModel):
    customer_id: str
    churn_probability: float
    is_churn: bool
    risk_segment: str  # High, Medium, Low
    explanations: List[FeatureExplanation]
    recommendations: List[Recommendation]


class PredictionJobOut(BaseModel):
    id: str
    filename: Optional[str] = None
    status: str
    total_records: int
    churned_records: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PredictionOut(BaseModel):
    id: str
    job_id: Optional[str] = None
    customer_id: str
    features: Dict[str, Any]
    churn_probability: float
    is_churn: bool
    explanation: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
