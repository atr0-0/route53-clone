from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.record_set import RecordSet


class RecordValue(Base):
    __tablename__ = "record_values"
    __table_args__ = (
        UniqueConstraint("record_set_id", "ordinal", name="uq_record_values_ordinal"),
        CheckConstraint("length(value) <= 4000", name="ck_record_values_length"),
        Index("ix_record_values_value", "value"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    record_set_id: Mapped[int] = mapped_column(
        ForeignKey("record_sets.id", ondelete="CASCADE"), nullable=False
    )
    value: Mapped[str] = mapped_column(String, nullable=False)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    record_set: Mapped["RecordSet"] = relationship(back_populates="values")
