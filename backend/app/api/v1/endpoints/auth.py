"""Authentication router for registration, login, JWT token issuance, and user profile."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_admin
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, UserRole
from app.schemas.token import Token

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
def register(
    user_in: UserCreate,
    db: Session = Depends(get_db)
):
    """Register a new driver or authority account with email uniqueness validation and password hashing."""
    existing_user = db.execute(
        select(User).where(User.email == user_in.email)
    ).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    role_str = user_in.role.value if hasattr(user_in.role, "value") else str(user_in.role)
    is_admin = role_str == UserRole.ADMIN.value

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=role_str,
        mobile=user_in.mobile,
        preferred_language=user_in.preferred_language,
        voice_alerts=user_in.voice_alerts,
        sound_alerts=user_in.sound_alerts,
        vibration_alerts=user_in.vibration_alerts,
        is_active=True,
        is_superuser=is_admin,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=Token,
    summary="Login with JSON credentials"
)
def login_json(
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """Authenticate user with JSON payload (email & password) and return signed JWT access token."""
    user = db.execute(
        select(User).where(User.email == credentials.email)
    ).scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account."
        )

    # Restrict admin role login to the single authorized administrator email
    user_role_str = str(user.role).strip().lower()
    if user_role_str == UserRole.ADMIN.value.lower() or user_role_str == "admin":
        authorized_admin = getattr(settings, "ADMIN_EMAIL", "admin@margrakshak.in").strip().lower()
        if user.email.strip().lower() != authorized_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access is restricted to the authorized administrator account."
            )

    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        email=user.email
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post(
    "/login/access-token",
    response_model=Token,
    summary="OAuth2 compatible token login (for Swagger UI /docs)"
)
def login_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """OAuth2 compatible token login for FastAPI Swagger documentation Authorize button."""
    user = db.execute(
        select(User).where(User.email == form_data.username)
    ).scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account."
        )

    # Restrict admin role login to the single authorized administrator email
    user_role_str = str(user.role).strip().lower()
    if user_role_str == UserRole.ADMIN.value.lower() or user_role_str == "admin":
        authorized_admin = getattr(settings, "ADMIN_EMAIL", "admin@margrakshak.in").strip().lower()
        if user.email.strip().lower() != authorized_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access is restricted to the authorized administrator account."
            )

    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        email=user.email
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile"
)
def get_me(
    current_user: User = Depends(get_current_user)
):
    """Return the profile of the currently authenticated user identified by the Bearer token."""
    return current_user


@router.get(
    "/admin/test",
    summary="Verify ADMIN role access"
)
def admin_only_test(
    current_admin: User = Depends(get_current_admin)
):
    """Protected endpoint accessible exclusively to administrators."""
    return {
        "status": "authorized",
        "message": f"Welcome Admin {current_admin.full_name}",
        "admin_id": current_admin.id,
        "role": current_admin.role
    }
