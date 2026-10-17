"""User Management API endpoints.
Provides paginated list of registered users for administrators.
"""
import math
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.user import User
from app.schemas.user import UserResponse, PaginatedUserResponse

router = APIRouter()


@router.get(
    "",
    response_model=PaginatedUserResponse,
    summary="Get paginated list of users (Admin only)",
    description="Retrieve registered users with optional role filtering and search by name/email/mobile. Requires administrator privileges.",
)
def get_users(
    role: Optional[str] = Query(None, description="Filter by role (e.g. admin, user, authority)"),
    search: Optional[str] = Query(None, description="Search term matching full_name, email, or mobile"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """List registered users with pagination and filtering for administrative oversight."""
    query = select(User)

    if role and role.strip().upper() != "ALL":
        query = query.where(func.lower(User.role) == role.strip().lower())

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.mobile.ilike(search_pattern),
            )
        )

    # Calculate total count
    total_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(total_query) or 0

    # Paginate and order by newest first
    query = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    items = db.scalars(query).all()

    total_pages = math.ceil(total / limit) if total > 0 else 1

    return PaginatedUserResponse(
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        items=[UserResponse.model_validate(item) for item in items],
    )
