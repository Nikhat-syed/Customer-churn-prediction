from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.predict import router as predict_router
from app.api.analytics import router as analytics_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(predict_router)
api_router.include_router(analytics_router)
