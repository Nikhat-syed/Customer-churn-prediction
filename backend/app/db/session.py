from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# Engine configuration with resilient fallback
try:
    # If using postgresql, we can add pool settings. SQLite doesn't support them.
    if settings.DATABASE_URL.startswith("postgresql"):
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=3600
        )
    else:
        # SQLite needs connect_args for multithreading
        engine = create_engine(
            settings.DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
    # Test connection
    with engine.connect() as conn:
        print(f"Database connection successful using URL: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
except Exception as e:
    print(f"Database connection failed with error: {e}")
    # Fallback to local SQLite database if connection failed
    fallback_db = "sqlite:///./churn_fallback.db"
    print(f"Falling back to local SQLite database: {fallback_db}")
    engine = create_engine(
        fallback_db,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency to get SQLAlchemy database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
