from flask import Blueprint

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

from . import views  # noqa: F401

__all__ = ["admin_bp"]
