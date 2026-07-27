from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.hosted_zone import HostedZone


class HostedZoneTag(Base):
    __tablename__ = "hosted_zone_tags"
    __table_args__ = (UniqueConstraint("hosted_zone_id", "key", name="uq_hosted_zone_tags_key"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    hosted_zone_id: Mapped[int] = mapped_column(
        ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False
    )
    key: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    hosted_zone: Mapped["HostedZone"] = relationship(back_populates="tags")
