import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import Base, get_db
import uuid

# Setup local test database
TEST_DB_URL = "sqlite:///./test_api.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="module")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_api_health_check(client):
    """Verify health index endpoint returns welcome JSON."""
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]


def test_authentication_workflow(client):
    """Test user signup registration, JWT retrieval, and secure routing access."""
    email = f"test_{uuid.uuid4().hex[:6]}@company.com"
    password = "secure_password"
    
    # 1. Register User
    reg_res = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "full_name": "Test User",
        "role": "analyst"
    })
    assert reg_res.status_code == 201
    assert reg_res.json()["email"] == email
    
    # 2. Get JWT Access Token
    tok_res = client.post("/api/v1/auth/token", data={
        "username": email,
        "password": password
      }
    )
    assert tok_res.status_code == 200
    token = tok_res.json()["access_token"]
    assert token is not None
    
    # 3. Request protected dashboard endpoint with JWT auth header
    headers = {"Authorization": f"Bearer {token}"}
    dash_res = client.get("/api/v1/analytics/dashboard", headers=headers)
    assert dash_res.status_code == 200
    assert "total_predictions" in dash_res.json()
    
    # 4. Request predict single
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
        "TotalCharges": 900.00
    }
    
    pred_res = client.post("/api/v1/predict/single", json={
        "customer_id": "TEST-CUST",
        "features": mock_customer
    }, headers=headers)
    assert pred_res.status_code == 200
    assert pred_res.json()["customer_id"] == "TEST-CUST"
    assert "churn_probability" in pred_res.json()
