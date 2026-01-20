from fastapi import APIRouter

admin_bp = APIRouter(prefix="/admin")

from . import views  # noqa: F401

__all__ = ["admin_bp"]
