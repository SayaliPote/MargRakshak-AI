"""Prediction database model storing AI model inference outputs and evaluation metrics."""
from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Integer, Float, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geometry

from app.models.base import Base


class Prediction(Base):
    """AI risk inference record capturing spatial location, feature inputs, and confidence scores."""
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(100), default="RiskPredict-v2.4", nullable=False, index=True)
    algorithm: Mapped[str] = mapped_column(
        String(100),
        default="HDBSCAN + Random Forest Spatial Regressor",
        nullable=False
    )

    # Location of inference
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True, index=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True, index=True)

    # PostGIS Point geometry
    geom = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True
    )

    # Prediction outcomes
    # Levels: 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    predicted_risk_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    predicted_risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Serialized inputs and validation metrics
    input_features: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    model_metrics: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<Prediction id={self.id} model='{self.model_name}' risk_level='{self.predicted_risk_level}'>"
