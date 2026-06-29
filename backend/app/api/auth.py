import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
# pyrefly: ignore [missing-import]
from jose import JWTError, jwt
from sqlalchemy import desc
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.config import settings
from app.db.session import get_db
from app.models.user import User, AuditLog
from app.schemas.user import UserCreate, UserOut, Token, TokenData

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token")


def log_audit(db: Session, action: str, details: str, user_id: str = None, user_email: str = None):
    try:
        log = AuditLog(
            user_id=user_id,
            user_email=user_email,
            action=action,
            details=details
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Audit log writing failed: {str(e)}")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, hash_hex = hashed_password.split('$')
        calc_bytes = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return secrets.compare_digest(calc_bytes.hex(), hash_hex)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_bytes = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}${hash_bytes.hex()}"


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    hashed_password = get_password_hash(user_in.password)
    verification_code = str(secrets.randbelow(900000) + 100000)
    db_user = User(
        email=user_in.email,
        hashed_password=hashed_password,
        full_name=user_in.full_name,
        role=user_in.role or "analyst",
        is_verified=False,
        verification_code=verification_code
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    log_audit(
        db, 
        action="User Registration", 
        details=f"Created account. Email verification code generated: {verification_code}.", 
        user_id=db_user.id, 
        user_email=db_user.email
    )
    return db_user


@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    log_audit(db, action="User Login", details="Successful credentials login.", user_id=user.id, user_email=user.email)
    
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}


class GoogleLoginRequest(BaseModel):
    credential: str


@router.post("/google", response_model=Token)
def login_with_google(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Decodes the Google OAuth ID Token (JWT), extracts user profile info,
    dynamically provisions users, and returns an access token.
    """
    credential = payload.credential
    try:
        claims = jwt.get_unverified_claims(credential)
        email = claims.get("email")
        full_name = claims.get("name", "Google User")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google credential payload: email claim is missing."
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to parse Google credential token: {str(e)}"
        )
        
    # Check if user already exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Create user with a secure random password since they login via Google
        hashed_password = get_password_hash(secrets.token_hex(32))
        user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            role="analyst",
            is_verified=True # Google accounts are auto-verified
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        log_audit(db, action="Google Auto-Provision", details="New Google account auto-registered.", user_id=user.id, user_email=user.email)
        
    log_audit(db, action="Google OAuth Login", details="Successful Google login access.", user_id=user.id, user_email=user.email)
    
    # Return JWT token
    access_token = create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}


# --- Enterprise Authentication Extensions ---

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


class AuditLogOut(BaseModel):
    id: str
    user_email: Optional[str] = None
    action: str
    details: Optional[str] = None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }





@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        log_audit(db, "Forgot Password Request", f"Non-existent email: {payload.email}")
        return {"message": "If the account exists, a password reset token has been generated."}
        
    reset_token = str(uuid.uuid4())
    user.reset_token = reset_token
    db.commit()
    
    log_audit(db, "Forgot Password Request", f"Reset token generated for user: {user.email}", user_id=user.id, user_email=user.email)
    
    return {
        "message": "If the account exists, a password reset token has been generated.",
        "reset_token": reset_token
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == payload.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )
        
    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_token = None
    db.commit()
    
    log_audit(db, "Reset Password Success", f"User password updated successfully.", user_id=user.id, user_email=user.email)
    return {"message": "Password updated successfully."}


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )
        
    if user.verification_code != payload.code:
        log_audit(db, "Email Verification Failed", f"Invalid code attempted: {payload.code}", user_id=user.id, user_email=user.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code."
        )
        
    user.is_verified = True
    user.verification_code = None
    db.commit()
    
    log_audit(db, "Email Verification Success", f"User account email verified.", user_id=user.id, user_email=user.email)
    return {"message": "Email verified successfully."}


@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Allows administrators to audit user session events and pipeline executions."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Administrator privileges required."
        )
        
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(100).all()
    return logs
