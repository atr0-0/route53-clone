from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.hosted_zone_tag import HostedZoneTag
    from app.models.record_set import RecordSet
    from app.models.user import User


class HostedZone(Base):
    __tablename__ = "hosted_zones"
    __table_args__ = (
        CheckConstraint("type IN ('PUBLIC', 'PRIVATE')", name="ck_hosted_zones_type"),
        CheckConstraint(
            "description IS NULL OR length(description) <= 256", name="ck_hosted_zones_description_length"
        ),
        Index("ix_hosted_zones_type", "type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    name_servers: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="hosted_zones")
    record_sets: Mapped[list["RecordSet"]] = relationship(
        back_populates="hosted_zone", passive_deletes=True
    )
    tags: Mapped[list["HostedZoneTag"]] = relationship(
        back_populates="hosted_zone", passive_deletes=True
    )
