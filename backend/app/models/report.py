"""Report database model for tracking generated PDF, Excel, and CSV spatial audit exports."""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Report(Base):
    """Generated spatial analysis, hotspot audit, and safety report tracking."""
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Types: 'PDF', 'Excel', 'CSV'
    report_type: Mapped[str] = mapped_column(String(50), default="PDF", nullable=False)
    # Categories: 'Hotspot Audit', 'Spatial Analysis', 'Monthly Risk'
    category: Mapped[str] = mapped_column(String(100), default="Hotspot Audit", nullable=False)

    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    file_size: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    generated_by_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    generated_by: Mapped[Optional["User"]] = relationship("User", back_populates="reports")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<Report id={self.id} name='{self.name}' type='{self.report_type}'>"
