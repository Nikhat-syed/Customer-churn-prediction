import uuid
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="analyst")  # analyst, admin
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String(6), nullable=True)
    reset_token = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)
    user_email = Column(String(255), nullable=True)
    action = Column(String(255), nullable=False)
    details = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
