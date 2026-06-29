import os
import sys
import json
import requests
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.model_selection import train_test_split, StratifiedKFold, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)
# Classifiers
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostClassifier
import joblib

# Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
DATA_URL = "https://raw.githubusercontent.com/IBM/telco-customer-churn-on-icp4d/master/data/Telco-Customer-Churn.csv"
DATA_PATH = os.path.join(DATA_DIR, "Telco-Customer-Churn.csv")

# Create directories
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def download_or_generate_data():
    """Loads Telco Churn CSV or generates high-fidelity synthetic fallback."""
    print("Attempting to load dataset...")
    if os.path.exists(DATA_PATH):
        print(f"Dataset already exists at {DATA_PATH}. Loading local copy...")
        return pd.read_csv(DATA_PATH)
    
    try:
        print(f"Downloading from: {DATA_URL}")
        response = requests.get(DATA_URL, timeout=15)
        if response.status_code == 200:
            with open(DATA_PATH, "w", encoding="utf-8") as f:
                f.write(response.text)
            print("Download successful!")
            return pd.read_csv(DATA_PATH)
        else:
            raise Exception(f"Failed download, status code: {response.status_code}")
    except Exception as e:
        print(f"Download failed: {e}. Generating synthetic fallback...")
        return generate_synthetic_data()


def generate_synthetic_data(num_rows=2000):
    """Generates synthetic Telco Churn data matching the IBM schema exactly."""
    np.random.seed(42)
    genders = ["Female", "Male"]
    yes_no = ["Yes", "No"]
    internet_services = ["DSL", "Fiber optic", "No"]
    multiple_lines_options = ["No phone service", "No", "Yes"]
    online_security_options = ["No internet service", "No", "Yes"]
    contract_options = ["Month-to-month", "One year", "Two year"]
    payment_methods = [
        "Electronic check", "Mailed check", 
        "Bank transfer (automatic)", "Credit card (automatic)"
    ]
    
    data = []
    for _ in range(num_rows):
        cid = f"{np.random.randint(1000, 9999)}-{np.random.choice(['AAAA', 'BBBB', 'CCCC', 'DDDD'])}{np.random.randint(10, 99)}"
        gender = np.random.choice(genders)
        senior = np.random.choice([0, 1], p=[0.85, 0.15])
        partner = np.random.choice(yes_no)
        dependents = np.random.choice(yes_no, p=[0.3, 0.7])
        
        contract = np.random.choice(contract_options, p=[0.55, 0.20, 0.25])
        if contract == "Month-to-month":
            tenure = np.random.randint(1, 18)
        elif contract == "One year":
            tenure = np.random.randint(12, 36)
        else:
            tenure = np.random.randint(24, 72)
            
        phone_service = np.random.choice(yes_no, p=[0.9, 0.1])
        if phone_service == "No":
            multiple_lines = "No phone service"
        else:
            multiple_lines = np.random.choice(["No", "Yes"], p=[0.6, 0.4])
            
        internet = np.random.choice(internet_services, p=[0.3, 0.5, 0.2])
        if internet == "No":
            sec = backup = prot = support = tv = movies = "No internet service"
        else:
            sec = np.random.choice(["No", "Yes"], p=[0.7, 0.3])
            backup = np.random.choice(["No", "Yes"], p=[0.6, 0.4])
            prot = np.random.choice(["No", "Yes"], p=[0.6, 0.4])
            support = np.random.choice(["No", "Yes"], p=[0.7, 0.3])
            tv = np.random.choice(["No", "Yes"], p=[0.5, 0.5])
            movies = np.random.choice(["No", "Yes"], p=[0.5, 0.5])
            
        paperless = np.random.choice(yes_no, p=[0.6, 0.4])
        pay_method = np.random.choice(payment_methods)
        
        base_charge = 20.0
        if internet == "DSL":
            base_charge += 30.0
        elif internet == "Fiber optic":
            base_charge += 55.0
            
        if phone_service == "Yes":
            base_charge += 10.0
        if multiple_lines == "Yes":
            base_charge += 5.0
        if sec == "Yes": base_charge += 5.0
        if backup == "Yes": base_charge += 5.0
        if prot == "Yes": base_charge += 5.0
        if support == "Yes": base_charge += 5.0
        if tv == "Yes": base_charge += 10.0
        if movies == "Yes": base_charge += 10.0
        
        monthly_charges = round(base_charge + np.random.uniform(-5.0, 5.0), 2)
        total_charges = round(monthly_charges * tenure, 2)
        
        churn_prob = 0.05
        if contract == "Month-to-month": churn_prob += 0.30
        if internet == "Fiber optic": churn_prob += 0.15
        if support == "No": churn_prob += 0.15
        if tenure < 6: churn_prob += 0.20
        if pay_method == "Electronic check": churn_prob += 0.10
        if sec == "No": churn_prob += 0.05
        
        churn_prob = min(max(churn_prob, 0.01), 0.99)
        churn = "Yes" if np.random.rand() < churn_prob else "No"
        
        data.append([
            cid, gender, senior, partner, dependents, tenure, phone_service,
            multiple_lines, internet, sec, backup, prot, support, tv, movies,
            contract, paperless, pay_method, monthly_charges, total_charges, churn
        ])
        
    cols = [
        "customerID", "gender", "SeniorCitizen", "Partner", "Dependents",
        "tenure", "PhoneService", "MultipleLines", "InternetService",
        "OnlineSecurity", "OnlineBackup", "DeviceProtection", "TechSupport",
        "StreamingTV", "StreamingMovies", "Contract", "PaperlessBilling",
        "PaymentMethod", "MonthlyCharges", "TotalCharges", "Churn"
    ]
    df = pd.DataFrame(data, columns=cols)
    df.to_csv(DATA_PATH, index=False)
    print(f"Synthetic dataset of {num_rows} rows saved to {DATA_PATH}")
    return df


class FeatureEngineer(BaseEstimator, TransformerMixin):
    """
    Custom Scikit-Learn Transformer for data cleaning and feature engineering.
    This encapsulates feature calculations inside the scikit pipeline,
    guaranteeing that training and validation/inference steps are identical
    and eliminating training-serving data leakage.
    """
    def fit(self, X, y=None):
        return self
        
    def transform(self, X):
        X = X.copy()
        
        # 1. TotalCharges cleaning, conversion, and dynamic mapping if missing
        if 'TotalCharges' not in X.columns:
            X['TotalCharges'] = X['MonthlyCharges'] * X['tenure'] if ('MonthlyCharges' in X.columns and 'tenure' in X.columns) else 0.0
        else:
            X['TotalCharges'] = X['TotalCharges'].replace(r'^\s*$', np.nan, regex=True)
            X['TotalCharges'] = pd.to_numeric(X['TotalCharges'], errors='coerce')
            X['TotalCharges'] = X['TotalCharges'].fillna(X['MonthlyCharges'] * X['tenure'] if ('MonthlyCharges' in X.columns and 'tenure' in X.columns) else 0.0)
            
        # Guarantee numeric types are present and casted safely
        for col in ['tenure', 'MonthlyCharges', 'TotalCharges']:
            if col not in X.columns:
                X[col] = 0.0
            X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0.0)
            
        # 2. Engineered numerical features
        X['ChargesPerTenure'] = X['MonthlyCharges'] / (X['tenure'] + 1)
        X['ExpectedTotalCharges'] = X['MonthlyCharges'] * X['tenure']
        X['ChargesDifference'] = X['TotalCharges'] - X['ExpectedTotalCharges']
        
        # 3. Engineered interactive features
        if 'InternetService' in X.columns and 'TechSupport' in X.columns:
            X['FiberOpticNoSupport'] = ((X['InternetService'] == 'Fiber optic') & (X['TechSupport'] == 'No')).astype(float)
        else:
            X['FiberOpticNoSupport'] = 0.0
            
        if 'tenure' in X.columns:
            X['LongTermCustomer'] = (X['tenure'] > 24).astype(float)
        else:
            X['LongTermCustomer'] = 0.0
            
        # Ensure all columns required by subsequent ColumnTransformer are present
        required_cats = [
            "gender", "SeniorCitizen", "Partner", "Dependents", "PhoneService", 
            "MultipleLines", "InternetService", "OnlineSecurity", "OnlineBackup", 
            "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies", 
            "Contract", "PaperlessBilling", "PaymentMethod"
        ]
        for col in required_cats:
            if col not in X.columns:
                # Use standard modes/defaults as fallback values
                X[col] = "No" if col != "gender" else "Male"
                
        return X


def clean_and_prepare_data(df):
    """Initial target mapping and row cleaning."""
    df = df.copy()
    
    # TotalCharges often contains empty spaces " " in original dataset
    if 'TotalCharges' in df.columns:
        df['TotalCharges'] = df['TotalCharges'].replace(r'^\s*$', np.nan, regex=True)
        df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce')
        df['TotalCharges'] = df['TotalCharges'].fillna(df['MonthlyCharges'] * df['tenure'])
        
    if 'Churn' in df.columns:
        df['Churn'] = df['Churn'].map({"Yes": 1, "No": 0})
    return df


def get_next_version(artifacts_dir):
    """Determines the next version string by parsing latest_model.json."""
    latest_json_path = os.path.join(artifacts_dir, "latest_model.json")
    if os.path.exists(latest_json_path):
        try:
            with open(latest_json_path, "r") as f:
                data = json.load(f)
            version_str = data.get("latest_version", "v1.0.0")
            if version_str.startswith("v"):
                version_str = version_str[1:]
            parts = version_str.split(".")
            if len(parts) == 3:
                major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
                patch += 1
                return f"v{major}.{minor}.{patch}"
        except Exception:
            pass
    return "v1.0.0"


def train_pipeline(df=None):
    """
    Executes the full pipeline: downloads data, cleans target, splits train/test,
    builds pipeline steps, runs grid search cross-validation on 8 models,
    compares metrics, versions the best model, and outputs comparison.
    """
    if df is None:
        raw_df = download_or_generate_data()
    else:
        raw_df = df
        
    cleaned_df = clean_and_prepare_data(raw_df)
    
    # Exclude ID and target
    X = cleaned_df.drop(columns=["customerID", "Churn"], errors='ignore')
    y = cleaned_df["Churn"]
    
    categorical_cols = [
        "gender", "SeniorCitizen", "Partner", "Dependents", "PhoneService", 
        "MultipleLines", "InternetService", "OnlineSecurity", "OnlineBackup", 
        "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies", 
        "Contract", "PaperlessBilling", "PaymentMethod"
    ]
    
    # Numerical features including original + engineered ones
    numerical_cols = [
        "tenure", "MonthlyCharges", "TotalCharges", 
        "ChargesPerTenure", "ExpectedTotalCharges", "ChargesDifference",
        "FiberOpticNoSupport", "LongTermCustomer"
    ]
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Base Preprocessor
    numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
    
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numeric_transformer, numerical_cols),
            ('cat', categorical_transformer, categorical_cols)
        ]
    )
    
    # Define the 8 models
    models = {
        "logistic_regression": LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42),
        "decision_tree": DecisionTreeClassifier(class_weight="balanced", random_state=42),
        "random_forest": RandomForestClassifier(class_weight="balanced", random_state=42),
        "xgboost": xgb.XGBClassifier(eval_metric="logloss", random_state=42),
        "lightgbm": lgb.LGBMClassifier(class_weight="balanced", random_state=42, verbosity=-1),
        "catboost": CatBoostClassifier(auto_class_weights="Balanced", random_state=42, verbose=0),
        "svm": SVC(class_weight="balanced", probability=True, random_state=42),
        "knn": KNeighborsClassifier()
    }
    
    # Search spaces for Grid Search
    param_grids = {
        "logistic_regression": {
            "classifier__C": [0.1, 1.0, 10.0]
        },
        "decision_tree": {
            "classifier__max_depth": [3, 5, 8]
        },
        "random_forest": {
            "classifier__n_estimators": [50, 100],
            "classifier__max_depth": [5, 8]
        },
        "xgboost": {
            "classifier__n_estimators": [50, 100],
            "classifier__learning_rate": [0.05, 0.1],
            "classifier__max_depth": [3, 5]
        },
        "lightgbm": {
            "classifier__n_estimators": [50, 100],
            "classifier__learning_rate": [0.05, 0.1],
            "classifier__max_depth": [3, 5]
        },
        "catboost": {
            "classifier__iterations": [50, 100],
            "classifier__learning_rate": [0.05, 0.1],
            "classifier__depth": [3, 5]
        },
        "svm": {
            "classifier__C": [0.1, 1.0, 5.0]
        },
        "knn": {
            "classifier__n_neighbors": [3, 5, 7],
            "classifier__weights": ["uniform", "distance"]
        }
    }
    
    results = {}
    best_pipelines = {}
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    
    # Train and Tune each model using GridSearchCV
    for name, classifier in models.items():
        print(f"Tuning and Training model: {name}...")
        
        # Build complete pipeline
        pipeline = Pipeline(steps=[
            ('engineer', FeatureEngineer()),
            ('preprocessor', preprocessor),
            ('classifier', classifier)
        ])
        
        param_grid = param_grids.get(name, {})
        
        grid_search = GridSearchCV(
            pipeline,
            param_grid=param_grid,
            cv=cv,
            scoring="f1",
            n_jobs=-1
        )
        
        grid_search.fit(X_train, y_train)
        best_pipeline = grid_search.best_estimator_
        best_pipelines[name] = best_pipeline
        
        # Predict on holdout test set
        y_pred = best_pipeline.predict(X_test)
        y_prob = best_pipeline.predict_proba(X_test)[:, 1]
        
        # Compute performance metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        roc_auc = roc_auc_score(y_test, y_prob)
        cm = confusion_matrix(y_test, y_pred).tolist()  # serialize to list
        
        results[name] = {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "roc_auc": float(roc_auc),
            "confusion_matrix": cm,
            "best_params": grid_search.best_params_
        }
        
        print(f"[{name}] Test Accuracy: {acc:.4f} | F1: {f1:.4f} | ROC-AUC: {roc_auc:.4f}")
        
    # Select best model based on F1 Score
    best_model_name = max(results, key=lambda k: results[k]["f1_score"])
    print(f"\n--- Training Complete ---")
    print(f"Selected Best Model: {best_model_name}")
    
    # Save & Version Artifacts
    next_version = get_next_version(ARTIFACTS_DIR)
    version_dir = os.path.join(ARTIFACTS_DIR, "models", next_version)
    os.makedirs(version_dir, exist_ok=True)
    
    best_pipeline_obj = best_pipelines[best_model_name]
    
    # Save full scikit pipeline (includes FeatureEngineer, Preprocessor, and Classifier)
    joblib.dump(best_pipeline_obj, os.path.join(version_dir, "pipeline.joblib"))
    
    # Get feature names after onehot encoding
    try:
        transformer_preprocessor = best_pipeline_obj.named_steps['preprocessor']
        onehot_features = list(transformer_preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(categorical_cols))
        feature_names = numerical_cols + onehot_features
    except Exception:
        # Fallback names
        feature_names = numerical_cols + [f"cat_{i}" for i in range(len(categorical_cols))]
        
    metadata = {
        "latest_version": next_version,
        "best_model_name": best_model_name,
        "metrics": results,
        "feature_names": feature_names,
        "categorical_cols": categorical_cols,
        "numerical_cols": numerical_cols
    }
    
    # Write versioned metadata
    with open(os.path.join(version_dir, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    # Write pointer metadata
    pointer_data = {
        "latest_version": next_version,
        "active_model_path": f"models/{next_version}/pipeline.joblib",
        "metrics": results[best_model_name]
    }
    with open(os.path.join(ARTIFACTS_DIR, "latest_model.json"), "w") as f:
        json.dump(pointer_data, f, indent=4)
        
    print(f"Successfully serialized model version {next_version} to {version_dir}")
    return best_pipelines, results


if __name__ == "__main__":
    train_pipeline()
