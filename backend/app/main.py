import time
import logging
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request, status
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from fastapi.exceptions import RequestValidationError
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.config import settings
from app.db.session import engine, Base
from app.api.router import api_router
from app.models.user import User
from app.models.prediction import Prediction, PredictionJob

# Configure standard structured logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("churn_api")

# Initialize Database tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
    
    # Auto-seed default credentials
    # pyrefly: ignore [missing-import]
    from sqlalchemy.orm import Session
    from app.db.session import SessionLocal
    from app.api.auth import get_password_hash
    
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "admin@retainai.com").first()
        if not admin_user:
            new_admin = User(
                email="admin@retainai.com",
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                role="admin",
                is_verified=True
            )
            db.add(new_admin)
            
        demo_user = db.query(User).filter(User.email == "qa_verifier_live_demo@company.com").first()
        if not demo_user:
            new_demo = User(
                email="qa_verifier_live_demo@company.com",
                hashed_password=get_password_hash("secure_password123!"),
                full_name="QA Verifier",
                role="analyst",
                is_verified=True
            )
            db.add(new_demo)
            
        db.commit()
        logger.info("Default seed credentials initialized.")
        
        # Seed default predictions if empty
        prediction_count = db.query(Prediction).count()
        if prediction_count == 0:
            logger.info("Database predictions empty. Seeding realistic demo records...")
            # pyrefly: ignore [missing-import]
            from app.ml.model import predict_churn
            
            demo_customers = [
                # High Risk Profiles
                {"customer_id": "CUST-9812", "gender": "Female", "SeniorCitizen": 1, "Partner": "No", "Dependents": "No", "tenure": 2, "PhoneService": "Yes", "MultipleLines": "Yes", "InternetService": "Fiber optic", "OnlineSecurity": "No", "OnlineBackup": "No", "DeviceProtection": "No", "TechSupport": "No", "StreamingTV": "Yes", "StreamingMovies": "Yes", "Contract": "Month-to-month", "PaperlessBilling": "Yes", "PaymentMethod": "Electronic check", "MonthlyCharges": 95.50, "TotalCharges": 191.00},
                {"customer_id": "CUST-4412", "gender": "Male", "SeniorCitizen": 0, "Partner": "No", "Dependents": "No", "tenure": 1, "PhoneService": "Yes", "MultipleLines": "No", "InternetService": "Fiber optic", "OnlineSecurity": "No", "OnlineBackup": "No", "DeviceProtection": "No", "TechSupport": "No", "StreamingTV": "No", "StreamingMovies": "No", "Contract": "Month-to-month", "PaperlessBilling": "Yes", "PaymentMethod": "Electronic check", "MonthlyCharges": 70.15, "TotalCharges": 70.15},
                {"customer_id": "CUST-1034", "gender": "Female", "SeniorCitizen": 0, "Partner": "Yes", "Dependents": "No", "tenure": 5, "PhoneService": "Yes", "MultipleLines": "Yes", "InternetService": "Fiber optic", "OnlineSecurity": "No", "OnlineBackup": "Yes", "DeviceProtection": "No", "TechSupport": "No", "StreamingTV": "Yes", "StreamingMovies": "No", "Contract": "Month-to-month", "PaperlessBilling": "Yes", "PaymentMethod": "Electronic check", "MonthlyCharges": 89.90, "TotalCharges": 449.50},
                
                # Medium Risk Profiles
                {"customer_id": "CUST-8831", "gender": "Male", "SeniorCitizen": 0, "Partner": "Yes", "Dependents": "Yes", "tenure": 18, "PhoneService": "Yes", "MultipleLines": "No", "InternetService": "DSL", "OnlineSecurity": "Yes", "OnlineBackup": "No", "DeviceProtection": "No", "TechSupport": "No", "StreamingTV": "No", "StreamingMovies": "No", "Contract": "One year", "PaperlessBilling": "No", "PaymentMethod": "Mailed check", "MonthlyCharges": 45.00, "TotalCharges": 810.00},
                {"customer_id": "CUST-2391", "gender": "Female", "SeniorCitizen": 0, "Partner": "No", "Dependents": "No", "tenure": 10, "PhoneService": "Yes", "MultipleLines": "No", "InternetService": "DSL", "OnlineSecurity": "No", "OnlineBackup": "Yes", "DeviceProtection": "Yes", "TechSupport": "Yes", "StreamingTV": "No", "StreamingMovies": "Yes", "Contract": "Month-to-month", "PaperlessBilling": "No", "PaymentMethod": "Credit card (automatic)", "MonthlyCharges": 64.85, "TotalCharges": 648.50},
                
                # Low Risk Profiles
                {"customer_id": "CUST-7721", "gender": "Female", "SeniorCitizen": 0, "Partner": "Yes", "Dependents": "Yes", "tenure": 70, "PhoneService": "Yes", "MultipleLines": "Yes", "InternetService": "Fiber optic", "OnlineSecurity": "Yes", "OnlineBackup": "Yes", "DeviceProtection": "Yes", "TechSupport": "Yes", "StreamingTV": "Yes", "StreamingMovies": "Yes", "Contract": "Two year", "PaperlessBilling": "Yes", "PaymentMethod": "Bank transfer (automatic)", "MonthlyCharges": 115.50, "TotalCharges": 8085.00},
                {"customer_id": "CUST-0091", "gender": "Male", "SeniorCitizen": 0, "Partner": "Yes", "Dependents": "Yes", "tenure": 65, "PhoneService": "Yes", "MultipleLines": "No", "InternetService": "DSL", "OnlineSecurity": "Yes", "OnlineBackup": "Yes", "DeviceProtection": "Yes", "TechSupport": "Yes", "StreamingTV": "No", "StreamingMovies": "No", "Contract": "Two year", "PaperlessBilling": "No", "PaymentMethod": "Credit card (automatic)", "MonthlyCharges": 50.30, "TotalCharges": 3269.50},
                {"customer_id": "CUST-6523", "gender": "Male", "SeniorCitizen": 0, "Partner": "No", "Dependents": "No", "tenure": 55, "PhoneService": "Yes", "MultipleLines": "Yes", "InternetService": "No", "OnlineSecurity": "No internet service", "OnlineBackup": "No internet service", "DeviceProtection": "No internet service", "TechSupport": "No internet service", "StreamingTV": "No internet service", "StreamingMovies": "No internet service", "Contract": "Two year", "PaperlessBilling": "No", "PaymentMethod": "Mailed check", "MonthlyCharges": 25.00, "TotalCharges": 1375.00}
            ]
            
            for cust in demo_customers:
                cust_copy = cust.copy()
                cust_id = cust_copy.pop("customer_id")
                res = predict_churn(cust_copy)
                db_pred = Prediction(
                    customer_id=cust_id,
                    features=cust_copy,
                    churn_probability=res["churn_probability"],
                    is_churn=res["is_churn"],
                    explanation=res["explanations"]
                )
                db.add(db_pred)
            db.commit()
            logger.info("Seeded 8 realistic customer predictions successfully.")
    except Exception as seed_err:
        logger.error(f"Error seeding database records: {str(seed_err)}")
    finally:
        db.close()
except Exception as e:
    logger.error(f"Error initializing database tables: {str(e)}", exc_info=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Production-grade API for customer churn classification, model versioning, and explainability.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Policy
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request-Response logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log incoming request path and method
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(
            f"Completed request: {request.method} {request.url.path} "
            f"| Status: {response.status_code} | Duration: {process_time:.2f}ms"
        )
        return response
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(
            f"Failed request: {request.method} {request.url.path} "
            f"| Exception: {str(e)} | Duration: {process_time:.2f}ms", 
            exc_info=True
        )
        raise e


# Global Exception Handler: HTTP Exceptions
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"HTTP Exception on {request.url.path}: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )


# Global Exception Handler: Validation (Pydantic schemas validation errors)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation Exception on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Input validation failed. Please check payload fields.",
            "errors": exc.errors(),
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY
        }
    )


# Global Exception Handler: All Unhandled Exceptions (to avoid leaking stack traces)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.critical(f"Unhandled Exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Our engineering team has been notified.",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR
        }
    )


app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {"message": "Welcome to Customer Churn Prediction API. Docs available at /docs"}

